import { DataColumn, DataTable, type DataTableProps, Icon, Text } from '@umami/react-zen';
import type { ReactNode } from 'react';
import { DateDistance } from '@/components/common/DateDistance';
import { LinkButton } from '@/components/common/LinkButton';
import { SortableLabel } from '@/components/common/SortableLabel';
import { useMessages, useNavigation } from '@/components/hooks';
import { SquarePen } from '@/components/icons';
import styles from './WebsitesTable.module.css';

export interface WebsitesTableProps extends DataTableProps {
  showActions?: boolean;
  allowEdit?: boolean;
  allowView?: boolean;
  renderLink?: (row: any) => ReactNode;
}

export function WebsitesTable({ showActions, renderLink, ...props }: WebsitesTableProps) {
  const { t, labels } = useMessages();
  const { renderUrl } = useNavigation();

  return (
    <DataTable className={styles.table} {...props}>
      <DataColumn id="name" label={<SortableLabel label={t(labels.name)} sortKey="name" />}>
        {renderLink}
      </DataColumn>
      <DataColumn id="domain" label={<SortableLabel label={t(labels.domain)} sortKey="domain" />}>
        {(row: any) =>
          row.domain ? (
            <a
              className={styles.domain}
              href={`https://${row.domain}`}
              target="_blank"
              rel="noreferrer noopener"
              title={row.domain}
            >
              {row.domain}
            </a>
          ) : null
        }
      </DataColumn>
      <DataColumn
        id="created"
        label={
          <SortableLabel label={t(labels.created)} sortKey="createdAt" defaultDirection="desc" />
        }
        width="200px"
      >
        {(row: any) => (
          <Text color="muted">
            <DateDistance date={new Date(row.createdAt)} />
          </Text>
        )}
      </DataColumn>
      {showActions && (
        <DataColumn id="action" label=" " align="end" width="80px">
          {(row: any) => {
            const websiteId = row.id;

            return (
              <span title={t(labels.settings)}>
                <LinkButton
                  href={renderUrl(`/websites/${websiteId}/settings`)}
                  variant="quiet"
                  aria-label={t(labels.settings)}
                >
                  <Icon>
                    <SquarePen />
                  </Icon>
                </LinkButton>
              </span>
            );
          }}
        </DataColumn>
      )}
    </DataTable>
  );
}
