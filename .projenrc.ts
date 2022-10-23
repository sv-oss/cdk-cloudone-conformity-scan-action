import { javascript } from 'projen';
import { GitHubActionTypeScriptProject, RunsUsing } from 'projen-github-action-typescript';

const project = new GitHubActionTypeScriptProject({
  defaultReleaseBranch: 'main',
  devDeps: [
    'projen-github-action-typescript',
    '@types/node-fetch',
    '@types/semver',
    '@types/minimatch',
    'esbuild',
  ],
  name: 'cdk-cloudone-conformity-scan-action',
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  depsUpgradeOptions: {
    workflow: false,
  },
  deps: [
    'wretch',
    'node-fetch',
    'form-data',
    'aws-cdk-lib-schema-20@npm:aws-cdk-lib@2.31.1',
    'aws-cdk-lib-schema-21@npm:aws-cdk-lib@2.44.0',
    'semver',
    'minimatch',
  ],
  actionMetadata: {
    author: 'Service Victoria Platform Engineering',
    name: 'Cloud One Conformity Scan',
    description: 'Perform a conformity scan on a CDK cloud assembly using TrendMicro CloudOne Conformity',
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
      cloudAssemblyDirectory: {
        description: 'Path to the cdk cloud assembly directory',
        required: false,
        default: 'cdk.out',
      },
      selectStacks: {
        description: 'Limit the scanning to the selected (comma-separated) list of stacks (support wildcards)',
        required: false,
      },
      outputFile: {
        description: 'File name in which the markdown output will be written',
        required: false,
        default: 'report.md',
      },
    },
  },
});

project.addGitIgnore('cdk.out');
project.addGitIgnore('output.md');

project.tsconfig?.compilerOptions.lib?.push('dom');

project.packageTask.reset('esbuild --platform=node --bundle lib/index.js --outdir=dist --minify --sourcemap');

project.synth();
