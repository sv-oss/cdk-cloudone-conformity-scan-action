import { writeFileSync } from 'fs';
import * as core from '@actions/core';
import { stacksFromCloudAssembly } from './cdk';
import { getAccountByAwsAccountId, getAccounts, newConformityApiClient, riskFromValue, scanTemplate } from './conformity';
import { renderMarkdown } from './template';

async function run() {
  try {
    const apiKey = core.getInput('apiKey', { required: true });
    const region = core.getInput('region', { required: true });
    const outputFile = core.getInput('outputFile', { required: false });
    const cloudAssemblyDirectory = core.getInput('cloudAssemblyDirectory', { required: false });

    const selectStacksString = core.getInput('selectStacks', { required: false });
    const selectStacks = selectStacksString ? selectStacksString.split(',') : [];

    const stacks = stacksFromCloudAssembly(cloudAssemblyDirectory);
    if (stacks.length === 0) {
      throw new Error('no stacks found in provided cloud assembly');
    }

    const filteredStacks = selectStacks.length > 0 ? stacks.filter(s => selectStacks.includes(s.name)) : stacks;

    if (filteredStacks.length === 0) {
      throw new Error('no stacks found matching the provided filter');
    }

    const client = newConformityApiClient(apiKey, region);

    core.debug('retrieving cloud conformity accounts');
    const accounts = await getAccounts(client);

    const stacksRiskValues: number[] = [];
    const stacksMarkdown: string[] = [];

    for ( const stack of filteredStacks) {
      core.debug(`scanning stack ${stack.name}`);

      const account = stack.awsAccountId ? getAccountByAwsAccountId(accounts, stack.awsAccountId) : undefined;
      if (account) {
        core.debug(`resolved account ${JSON.stringify(account)}`);
      }

      const checks = await scanTemplate(client, {
        templateFilePath: stack.templateFilePath,
        templateType: 'cloudformation-template',
        accountId: account?.id,
      });

      // Filter out passing checks
      const filteredChecks = checks.filter(c => c.attributes.status !== 'SUCCESS');

      if (filteredChecks.length > 0) {
        // Sort by risk level
        const sortedChecks = filteredChecks.sort((a, b) => b.attributes.riskValue - a.attributes.riskValue);

        // Render to markdown
        const markdown = renderMarkdown(sortedChecks, stack, account);

        if (sortedChecks.length > 0) {
          const level = sortedChecks[0].attributes.riskValue;
          stacksRiskValues.push(level);
        }

        stacksMarkdown.push(markdown);
      }
    }

    // Output the highest risk level found in the checks or NONE
    const maxRisk = stacksRiskValues.length > 0 ? Math.max(...stacksRiskValues) : 0;
    core.setOutput('risk', riskFromValue(maxRisk));
    core.setOutput('riskValue', maxRisk);

    // Write output file
    const aggregateMarkdown = stacksMarkdown.join('\n\n---\n\n');
    writeFileSync(outputFile, aggregateMarkdown);


  } catch (error: any) {
    core.setFailed(error.message);
  }
}

void run();
