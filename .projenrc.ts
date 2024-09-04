import { javascript, github } from 'projen';
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
  minNodeVersion: '20.12.1',
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['deps-upgrade'],
    },
  },
  projenCredentials: github.GithubCredentials.fromApp({
    appIdSecret: 'CICD_APP_ID',
    privateKeySecret: 'CICD_APP_PRIVKEY',
  }),
  autoApproveOptions: {
    label: 'deps-upgrade',
    allowedUsernames: [
      'sv-oss-continuous-delivery[bot]',
    ],
  },
  dependabot: false,
  mutableBuild: false,
  minMajorVersion: 1,
  license: 'MIT',
  copyrightOwner: 'Service Victoria',
  deps: [
    'wretch',
    'node-fetch',
    'form-data',
    'aws-cdk-lib',
    'semver',
    'minimatch',
  ],
  actionMetadata: {
    author: 'Service Victoria Platform Engineering',
    name: 'Cloud One Conformity Scan',
    description: 'Perform a conformity scan on a CDK cloud assembly using TrendMicro CloudOne Conformity',
    runs: {
      using: RunsUsing.NODE_20,
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

project.tsconfig?.compilerOptions?.lib?.push('dom');

project.packageTask.reset('esbuild --platform=node --bundle lib/index.js --outdir=dist --minify --sourcemap');

// Build the project after upgrading so that the compiled JS ends up being committed
project.tasks.tryFind('post-upgrade')?.spawn(project.buildTask);

project.release?.addJobs({
  'floating-tags': {
    permissions: {
      contents: github.workflows.JobPermission.WRITE,
    },
    runsOn: ['ubuntu-latest'],
    needs: ['release_github'],
    steps: [
      { uses: 'actions/checkout@v4' },
      { uses: 'giantswarm/floating-tags-action@v1' },
    ],
  },
});


project.synth();
