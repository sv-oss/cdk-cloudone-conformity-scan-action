import * as core from '@actions/core';
import { newConformityApiClient, scanTemplate } from './conformity';


async function run() {
  try {
    const apiKey = core.getInput('apiKey', { required: true });
    const region = core.getInput('region', { required: true });
    const templateFile = core.getInput('templateFile', { required: true });

    const client = newConformityApiClient(apiKey, region);

    await scanTemplate(client, {
      templateFilePath: templateFile,
    });
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

void run();
