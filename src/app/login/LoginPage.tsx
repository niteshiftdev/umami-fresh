'use client';
import { Column, Loading } from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useLoginQuery } from '@/components/hooks';
import { LoginForm } from './LoginForm';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { user, isLoading } = useLoginQuery();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  if (isLoading || user) {
    return <Loading placement="absolute" />;
  }

  return (
    <div className={styles.rainbowContainer}>
      <div className={styles.rainbowContent}>
        <Column
          alignItems="center"
          justifyContent="flex-start"
          height="100vh"
          style={{ paddingTop: '15vh' }}
        >
          <LoginForm />
        </Column>
      </div>
    </div>
  );
}
