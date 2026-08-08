import { Icon, Row } from '@umami/react-zen';
import { Favicon } from '@/components/common/Favicon';
import { useConfig } from '@/components/hooks';
import { Globe } from '@/components/icons';

export function WebsiteFavicon({ domain }: { domain?: string }) {
  const config = useConfig();
  const showFavicon = !!domain && !config?.privateMode;

  return (
    <Row
      alignItems="center"
      justifyContent="center"
      width="32px"
      height="32px"
      border
      borderRadius
      backgroundColor="surface-raised"
      flexShrink={0}
    >
      {showFavicon ? (
        <Favicon domain={domain} />
      ) : (
        <Icon size="sm" color="muted">
          <Globe />
        </Icon>
      )}
    </Row>
  );
}
