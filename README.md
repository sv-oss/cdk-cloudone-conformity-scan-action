# cdk-cloudone-conformity-scan-action

A Github Action to compile a conformity report of a synthesized CDK application through the Trend Micro Cloud One Conformity API

## Description

This GitHub Action takes a synthesized CDK application Cloud Assembly (the `cdk.out` directory created by running `cdk synth`) and submits each stack's CloudFormation template to the the Trend Micro Cloud One Conformity API to produce a Markdown report.

This helps development teams write better CDK code and prevents non-conformant resources from being provisioned by providing early feedback on the quality of the produced CloudFormation templates

## Pre-requisites

- Valid Trend Micro Cloud One Conformity API key
- Synthesized Cloud Assembly package (`cdk.out` directory)

## Usage

### Basic Usage

Without any further option than the Conformity API key, the action will submit each stack and substack template found in the Cloud Assembly package for scanning by the `au-1` Conformity region and produce a report broken down by stack in a file called `report.md`.

```yaml
jobs:
  scan:
    runs-on: ubuntu-latest
    name: Scan Template
    steps:
    - name: Scan
      uses: sv-oss/cdk-cloudone-conformity-scan-action@v1
      with:
        apiKey: ${{ secrets.CONFORMITY_API }}
```

### Optional settings


| Setting name | Description | Default |
| ------------ | ----------- | ------- |
| region | Select a different Condormity API region | `au-1` |
| cloudAssemblyDirectory | Specified the directory in which to find the Cloud Assembly package | `cdk.out` |
| selectStacks | Comma-separated list of stacks to scan (support wildcards) | All stacks and substacks |
| outputFile | Name of the file in which to output the markdown report | `report.md` |


## Outputs

In addition to the markdown report, the action will publish the following outputs for use in successive steps

| Output name | Description |
| ----------- | ----------- |
| risk | Highest risk level found across all scanned stacks (`NONE`, `LOW`, `MEDIUM`, `HIGH`) |
| riskValue | Numerical representation of the highest risk ( `NONE=0`, `LOW=1`, `MEDIUM=2`, `HIGH=3`) |
| summary | Textual summary of the number of findings across stacks |
