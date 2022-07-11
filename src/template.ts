import { cdkPathByLogicalId, CdkStack } from './cdk';
import { Account, Check } from './conformity';

function indent(level: number, text: string, indentLength: number = 2): string {
  return ' '.repeat(indentLength*level) + text;
};

function renderSummaryTable(stack: CdkStack, account?: Account): string[] {
  const lines: string[] = [];

  lines.push(indent(0, '<table>'));
  lines.push(indent(1, '<tr>'));
  lines.push(indent(2, '<td nowrap><strong>Stack Name</strong></td>'));
  lines.push(indent(2, `<td>${stack.name}</td>`));
  lines.push(indent(1, '</tr>'));
  if (stack.awsAccountId) {
    lines.push(indent(1, '<tr>'));
    lines.push(indent(2, '<td nowrap><strong>Account ID</strong></td>'));
    lines.push(indent(2, `<td>${stack.awsAccountId}</td>`));
    lines.push(indent(1, '</tr>'));
  }
  if (account) {
    lines.push(indent(1, '<tr>'));
    lines.push(indent(2, '<td nowrap><strong>Account Name</strong></td>'));
    lines.push(indent(2, `<td>${account.attributes.name}</td>`));
    lines.push(indent(1, '</tr>'));
    lines.push(indent(1, '<tr>'));
    lines.push(indent(2, '<td nowrap><strong>Account Environment</strong></td>'));
    lines.push(indent(2, `<td>${account.attributes.environment}</td>`));
    lines.push(indent(1, '</tr>'));
  }
  lines.push(indent(0, '</table>'));

  return lines;
}

function renderMarkdownChecksTable(checks: Check[], stack: CdkStack): string[] {
  const lines: string[] = [];


  lines.push(indent(0, '<table>'));

  // HEAD
  lines.push(indent(1, '<thead>'));
  lines.push(indent(2, '<tr>'));
  lines.push(indent(3, '<th>Rule</th>'));
  lines.push(indent(3, '<th>Service</th>'));
  lines.push(indent(3, '<th>Risk Level</th>'));
  lines.push(indent(3, '<th>Message</th>'));
  lines.push(indent(3, '<th>Path</th>'));
  lines.push(indent(2, '</tr>'));
  lines.push(indent(1, '</thead>'));

  // BODY
  lines.push(indent(1, '<tbody>'));

  for (const check of checks) {
    const attr = check.attributes;
    const resource = cdkPathByLogicalId(stack, attr.resource) ?? attr.resource ?? '';
    const titleWithLink = `<a href="${attr['resolution-page-url']}">${attr['rule-title']}</a>`;

    lines.push(indent(2, '<tr>'));
    lines.push(indent(3, `<td>${titleWithLink}</td>`));
    lines.push(indent(3, `<td>${attr.service}</td>`));
    lines.push(indent(3, `<td>${attr['risk-level']}</td>`));
    lines.push(indent(3, `<td>${attr.message}}</td>`));
    lines.push(indent(3, `<td>${resource}</td>`));
    lines.push(indent(2, '</tr>'));
  }
  lines.push(indent(1, '</tbody>'));

  lines.push(indent(0, '</table>'));

  return lines;
}

export function renderMarkdown(checks: Check[], stack: CdkStack, account?: Account): string {
  const lines: string[] = [];

  lines.push(...renderSummaryTable(stack, account));
  lines.push('');
  lines.push(...renderMarkdownChecksTable(checks, stack));

  return lines.join('\n');
}
