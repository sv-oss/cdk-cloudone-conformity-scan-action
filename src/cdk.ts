import { join } from 'path';
import { cx_api, cloud_assembly_schema } from 'aws-cdk-lib';
import minimatch from 'minimatch';
import * as semver from 'semver';

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

export function selectStacksFromCloudAssembly(cloudAssemblyDirectory: string, patterns: string[]): CdkStack[] {
  const asm = new cx_api.CloudAssembly(cloudAssemblyDirectory);
  const stacks = semver.major(asm.version) < 10 ? asm.stacks : asm.stacksRecursively;

  const matchingPattern = (pattern: string) => (stack: cx_api.CloudFormationStackArtifact) => {
    if (minimatch(stack.hierarchicalId, pattern)) {
      return true;
    }
    return false;
  };

  const matchedStacks = flatten(patterns.map(pattern => stacks.filter(matchingPattern(pattern))));

  const extendedStacks = extendStacks(matchedStacks, stacks);

  return extendedStacks.map(s => {
    const stackAccountId = s.environment.account !== cx_api.UNKNOWN_ACCOUNT ? s.environment.account : undefined;
    const resources: CdkResource[] = s.findMetadataByType('aws:cdk:logicalId').map(m => ({ logicalId: (m.data as cloud_assembly_schema.LogicalIdMetadataEntry), path: m.path }));
    return {
      name: s.stackName,
      templateFilePath: join(cloudAssemblyDirectory, s.templateFile),
      awsAccountId: stackAccountId,
      resources: resources,
    };
  });
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

// Following code borrowed from https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk/lib/

/**
 * Flatten a list of lists into a list of elements
 */
export function flatten<T>(xs: T[][]): T[] {
  return Array.prototype.concat.apply([], xs);
}

function extendStacks(matched: cx_api.CloudFormationStackArtifact[], all: cx_api.CloudFormationStackArtifact[]) {
  const allStacks = new Map<string, cx_api.CloudFormationStackArtifact>();
  for (const stack of all) {
    allStacks.set(stack.hierarchicalId, stack);
  }

  const index = indexByHierarchicalId(matched);

  includeUpstreamStacks(index, allStacks);

  // Filter original array because it is in the right order
  const selectedList = all.filter(s => index.has(s.hierarchicalId));

  return selectedList;
}

function indexByHierarchicalId(stacks: cx_api.CloudFormationStackArtifact[]): Map<string, cx_api.CloudFormationStackArtifact> {
  const result = new Map<string, cx_api.CloudFormationStackArtifact>();

  for (const stack of stacks) {
    result.set(stack.hierarchicalId, stack);
  }

  return result;
}

/**
 * Calculate the transitive closure of stack dependencies.
 *
 * Modifies `selectedStacks` in-place.
 */
function includeUpstreamStacks(
  selectedStacks: Map<string, cx_api.CloudFormationStackArtifact>,
  allStacks: Map<string, cx_api.CloudFormationStackArtifact>) {
  const added = new Array<string>();
  let madeProgress = true;
  while (madeProgress) {
    madeProgress = false;

    for (const stack of selectedStacks.values()) {
      // Select an additional stack if it's not selected yet and a dependency of a selected stack (and exists, obviously)
      for (const dependencyId of stack.dependencies.map(x => x.manifest.displayName ?? x.id)) {
        if (!selectedStacks.has(dependencyId) && allStacks.has(dependencyId)) {
          added.push(dependencyId);
          selectedStacks.set(dependencyId, allStacks.get(dependencyId)!);
          madeProgress = true;
        }
      }
    }
  }
}
