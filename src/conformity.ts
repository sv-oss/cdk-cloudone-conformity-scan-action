import { readFileSync } from 'fs';
import { default as url } from 'url';
import { default as formData } from 'form-data';
import { default as nodeFetch } from 'node-fetch';
import wretch, { Wretcher } from 'wretch';

/**
 * Initializes an authenticated Wretcher client to the Cloud Conformity API
 * @param apiKey API key with access to cloud conformity
 * @param region API server region
 * @returns Configured Wretcher client
 */
export function newConformityApiClient(apiKey: string, region: string = 'au-1'): Wretcher {
  return wretch()
    .polyfills({
      fetch: nodeFetch,
      FormData: formData,
      URLSearchParams: url.URLSearchParams,
    })
    .url(`https://conformity.${region}.cloudone.trendmicro.com/api`)
    .auth('ApiKey ' + apiKey)
    .content('application/vnd.api+json');
}

export interface ScanTemplateProps {
  /**
   * Path to a file containing the template to scan
   */
  readonly templateFilePath: string;

  /**
   * Type of template to scan
   * @default 'cloudformation-template'
   */
  readonly templateType?: 'cloudformation-template' | 'terraform-template';

  /**
   * The id of a Account to run the rules against
   */
  readonly accountId?: string;

  /**
   * The id of a Profile to use when running the rules
   */
  readonly profileId?: string;
}

export async function scanTemplate(client: Wretcher, props: ScanTemplateProps) {
  const payload = {
    data: {
      attributes: {
        type: props.templateType ?? 'cloudformation-template',
        contents: readFileSync(props.templateFilePath).toString(),
        profileId: props.profileId,
        accountId: props.accountId,
      },
    },
  };

  const response = await client.body(payload).post();

  console.log(response);
}
