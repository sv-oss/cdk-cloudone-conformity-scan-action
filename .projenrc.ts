import { javascript } from 'projen';
import { GitHubActionTypeScriptProject, RunsUsing } from 'projen-github-action-typescript';

const project = new GitHubActionTypeScriptProject({
  defaultReleaseBranch: 'main',
  devDeps: [
    'projen-github-action-typescript',
    '@types/node-fetch',
  ],
  name: 'cloudone-conformity-template-scan-action',
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  depsUpgradeOptions: {
    workflow: false,
  },
  deps: [
    'wretch',
    'node-fetch',
    'form-data',
  ],
  actionMetadata: {
    author: 'Service Victoria Platform Engineering',
    name: 'Cloud One Conformity Template Scan',
    runs: {
      using: RunsUsing.NODE_16,
      main: 'dist/index.js',
    },
    inputs: {
      apiKey: {
        description: 'Cloud One API Key with permissions to Conformity',
        required: true,
      },
      region: {
        description: 'Cloud One Region',
        required: false,
        default: 'au-1',
      },
      templateFile: {
        description: 'Path to a template file to scan',
        required: false,
      },
      templateType: {
        description: 'Type of template to scan (one of "cloudformation-template" or "terraform-template")',
        required: false,
        default: 'cloudformation-template',
      },
    },
  },
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});

project.tsconfig?.compilerOptions.lib?.push('dom');

project.synth();
