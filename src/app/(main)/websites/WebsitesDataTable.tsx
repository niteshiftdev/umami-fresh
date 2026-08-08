import { Row, Text } from '@umami/react-zen';
import { DataGrid } from '@/components/common/DataGrid';
import { Empty } from '@/components/common/Empty';
import Link from '@/components/common/Link';
import {
  useLoginQuery,
  useMessages,
  useNavigation,
  useUserWebsitesQuery,
} from '@/components/hooks';
import { WebsiteFavicon } from './WebsiteFavicon';
import { WebsitesTable } from './WebsitesTable';

export function WebsitesDataTable({
  userId,
  teamId,
  allowEdit = true,
  allowView = true,
  showActions = true,
}: {
  userId?: string;
  teamId?: string;
  allowEdit?: boolean;
  allowView?: boolean;
  showActions?: boolean;
}) {
  const { user } = useLoginQuery();
  const queryResult = useUserWebsitesQuery({ userId: userId || user?.id, teamId });
  const { renderUrl, query } = useNavigation();
  const { t, messages } = useMessages();

  const renderLink = (row: any) => (
    <Row alignItems="center" gap="3">
      <WebsiteFavicon domain={row.domain} />
      <Link href={renderUrl(`/websites/${row.id}`, false)}>
        <Text weight="bold" truncate title={row.name}>
          {row.name}
        </Text>
      </Link>
    </Row>
  );

  return (
    <DataGrid
      query={queryResult}
      allowSearch
      allowPaging
      renderEmpty={() => (
        <Empty
          message={t(query?.search ? messages.noResultsFound : messages.noWebsitesConfigured)}
        />
      )}
    >
      {({ data }) => (
        <WebsitesTable
          data={data}
          showActions={showActions}
          allowEdit={allowEdit}
          allowView={allowView}
          renderLink={renderLink}
        />
      )}
    </DataGrid>
  );
}
