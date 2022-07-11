import { join } from 'path';
import { cx_api, cloud_assembly_schema } from 'aws-cdk-lib';

export interface CdkResource {
  readonly logicalId: string;
  readonly path: string;
}

export interface CdkStack {
  readonly name: string;
  readonly templateFilePath: string;
  readonly awsAccountId?: string;
  readonly resources: CdkResource[];
}

export function stacksFromCloudAssembly(cloudAssemblyDirectory: string): CdkStack[] {
  const stacks: CdkStack[] = [];
  const cx = new cx_api.CloudAssembly(cloudAssemblyDirectory);
  cx.stacks.forEach(stack => {
    const stackAccountId = stack.environment.account !== cx_api.UNKNOWN_ACCOUNT ? stack.environment.account : undefined;

    const resources: CdkResource[] = stack.findMetadataByType('aws:cdk:logicalId').map(m => ({ logicalId: (m.data as cloud_assembly_schema.LogicalIdMetadataEntry), path: m.path }));

    stacks.push({
      templateFilePath: join(cloudAssemblyDirectory, stack.templateFile),
      name: stack.stackName,
      awsAccountId: stackAccountId,
      resources: resources,
    });
  });

  return stacks;
}

export function cdkPathByLogicalId(stack: CdkStack, logicalId: string, removeStackName: boolean = true): string | undefined {
  let path: string | undefined = undefined;
  for (const r of stack.resources) {
    if (logicalId.toLowerCase().includes(r.logicalId.toLowerCase())) {
      path = r.path;
      break;
    }
  }
  if (path && removeStackName) {
    path = path.replace(`/${stack.name}`, '');
  }
  return path;
}
