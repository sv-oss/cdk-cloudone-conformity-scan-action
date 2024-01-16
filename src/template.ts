import { cdkPathByLogicalId, CdkStack } from './cdk';
import { Account, Check } from './conformity';

export const riskEmojiMap: Record<string, string> = {
  HIGH: '⛔️',
  MEDIUM: '⚠️',
  LOW: 'ℹ️',
};

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

function renderMarkdownChecksTable(checks: Check[], stack: CdkStack, maxLength: number): string[] {
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

  const footer = [
    indent(1, '</tbody>'),
    indent(0, '</table>'),
  ];

  const tooBigFallback = (count: number) => [
    indent(2, '<tr>'),
    indent(3, `<td colspan="5">And ${count} more...</td>`),
    indent(2, '</tr>'),
  ];

  // BODY
  lines.push(indent(1, '<tbody>'));

  // calculate the max length that the checks can actually work with
  const checksMaxLength = maxLength - [...lines, ...footer].join('\n').length;

  let count = 0;
  let i = -1;
  for (const check of checks) {
    i++;
    const tempLines: string[] = [];
    const attr = check.attributes;
    const resource = cdkPathByLogicalId(stack, attr.resource) ?? attr.resource ?? '';
    const titleWithLink = `<a href="${attr['resolution-page-url']}">${attr['rule-title']}</a>`;
    const riskLevelEmoji = riskEmojiMap[attr['risk-level']];

    tempLines.push(
      indent(2, '<tr>'),
      indent(3, `<td>${titleWithLink}</td>`),
      indent(3, `<td>${attr.service}</td>`),
      indent(3, `<td>${riskLevelEmoji} ${attr['risk-level']}</td>`),
      indent(3, `<td>${attr.message}}</td>`),
      indent(3, `<td>${resource}</td>`),
      indent(2, '</tr>'),
    );
    const chunkSize = tempLines.join('\n').length;

    if (chunkSize + count < checksMaxLength) {
      lines.push(...tempLines);
      count += chunkSize;

      // if adding the too big message makes the next chunk too big, add the too big message & break out of the loop
      if (tooBigFallback(checks.length - i).join('\n').length + chunkSize + count > checksMaxLength) {
        lines.push(...tooBigFallback(checks.length - i));
        break;
      }
    }
  };

  lines.push(...footer);

  return lines;
}

export function renderMarkdown(checks: Check[], stack: CdkStack, maxChars: number, account?: Account): string {
  const lines: string[] = [];

  lines.push(...renderSummaryTable(stack, account));
  lines.push('');

  const maxLength = maxChars - lines.join('\n').length;
  lines.push(...renderMarkdownChecksTable(checks, stack, maxLength));

  return lines.join('\n');
}
