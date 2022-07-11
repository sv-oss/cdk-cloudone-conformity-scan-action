import { readFileSync } from 'fs';
import { default as url } from 'url';
import { default as formData } from 'form-data';
import { default as nodeFetch } from 'node-fetch';
import wretch, { Wretcher } from 'wretch';

export const riskMap: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
};

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

export interface CheckAttributes {
  region?: string;
  status: string;
  'risk-level': string;
  message: string;
  resource: string;
  descriptorType: string;
  categories: string[];
  compliances: string[];
  'rule-title': string;
  'resolution-page-url': string;
  service: string;
  riskValue: number;
}

export interface Check {
  id: string;
  type: string;
  attributes: CheckAttributes;
}

export interface AccountAttributes {
  name: string;
  environment: string;
  'awsaccount-id'?: string;
}

export interface Account {
  id: string;
  type: string;
  attributes: AccountAttributes;
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

export async function getAccounts(client: Wretcher): Promise<Account[]> {
  const response = await client.url('/accounts').get().json();

  const accounts = response.data as Account[];
  return accounts;
}


export function getAccountByAwsAccountId(accounts: Account[], id: string): Account | undefined {
  for (const account of accounts) {
    if (account.attributes['awsaccount-id'] === id) {
      return account;
    }
  }
  return undefined;
}

export async function scanTemplate(client: Wretcher, props: ScanTemplateProps): Promise<Check[]> {
  const templateContents = readFileSync(props.templateFilePath).toString();
  const payload = {
    data: {
      attributes: {
        type: props.templateType ?? 'cloudformation-template',
        contents: templateContents,
        profileId: props.profileId,
        accountId: props.accountId,
      },
    },
  };

  const response = await client.url('/template-scanner/scan').json(payload).post().json();

  const checks = response.data as Check[];

  checks.forEach(c => c.attributes.riskValue = riskMap[c.attributes['risk-level']]);

  return checks;
}

export function riskFromValue(value: number): string | undefined {
  for (const r of Object.keys(riskMap)) {
    if (riskMap[r] === value) {
      return r;
    }
  }
  return undefined;
}
