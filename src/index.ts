import { writeFileSync } from 'fs';
import * as core from '@actions/core';
import { selectStacksFromCloudAssembly } from './cdk';
import { Check, getAccountByAwsAccountId, getAccounts, newConformityApiClient, riskFromValue, scanTemplate } from './conformity';
import { renderMarkdown } from './template';

const MAX_COMMENT_SIZE = 65535;

async function run() {
  try {
    const apiKey = core.getInput('apiKey', { required: true });
    const region = core.getInput('region', { required: true });
    const outputFile = core.getInput('outputFile', { required: false });
    const cloudAssemblyDirectory = core.getInput('cloudAssemblyDirectory', { required: false });

    const selectStacksString = core.getInput('selectStacks', { required: false });
    const selectStacks = selectStacksString ? selectStacksString.split(',') : [];

    const filteredStacks = selectStacksFromCloudAssembly(cloudAssemblyDirectory, selectStacks);

    if (filteredStacks.length === 0) {
      throw new Error('no stacks found matching the provided filter');
    }

    const client = newConformityApiClient(apiKey, region);

    core.debug('retrieving cloud conformity accounts');
    const accounts = await getAccounts(client);

    const stacksRiskValues: number[] = [];
    const stacksMarkdown: string[] = [];

    const cumulativeChecks: Check[] = [];
    const markdownJoiner = '\n\n---\n\n';
    let charCount = 0;
    let exceedsMaxCommentCount = 0;

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

      cumulativeChecks.push(...filteredChecks);

      if (filteredChecks.length > 0) {
        // Sort by risk level
        const sortedChecks = filteredChecks.sort((a, b) => b.attributes.riskValue - a.attributes.riskValue);

        // Render to markdown
        const markdown = renderMarkdown(sortedChecks, stack, MAX_COMMENT_SIZE - charCount, account);

        if (sortedChecks.length > 0) {
          const level = sortedChecks[0].attributes.riskValue;
          stacksRiskValues.push(level);
        }

        if (charCount + markdown.length + markdownJoiner.length <= MAX_COMMENT_SIZE) {
          stacksMarkdown.push(markdown);
        } else {
          exceedsMaxCommentCount++;
        }
      }
    }

    // Output the highest risk level found in the checks or NONE
    const maxRisk = Math.max(0, ...stacksRiskValues);
    core.setOutput('risk', riskFromValue(maxRisk));
    core.setOutput('riskValue', maxRisk);
    core.setOutput('summary', getSummary(cumulativeChecks));

    // Write output file
    let aggregateMarkdown = stacksMarkdown.join(markdownJoiner);
    if (exceedsMaxCommentCount > 0) {
      aggregateMarkdown += `And ${exceedsMaxCommentCount} more`;
    }

    writeFileSync(outputFile, aggregateMarkdown);


  } catch (error: any) {
    core.setFailed(error.message);
  }
}

function toSentenceCase(str: string) {
  return str[0].toUpperCase() + str.substring(1).toLowerCase();
}

function getSummary(checks: Check[]): string {
  const checkCounts: Record<string, number> = {};
  checks.forEach(check => {
    if (!(check.attributes['risk-level'] in checkCounts)) {
      checkCounts[check.attributes['risk-level']] = 0;
    }
    checkCounts[check.attributes['risk-level']]++;
  });

  return Object.entries(checkCounts).map(([key, value]) => `${value} ${toSentenceCase(key)}`).join(', ');
}

void run();
