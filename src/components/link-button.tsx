'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';

type ButtonProps = ComponentProps<typeof Button>;

/**
 * Товч шиг харагдах ХОЛБООС.
 *
 * Base UI-ийн `Button` нь анхдагчаар `<button>` render хийхийг хүлээдэг тул
 * `render={<Link/>}` (=`<a>`) дамжуулахад `nativeButton={false}` заавал
 * шаардана — эс тэгвээс native button семантик алдагдана гэж анхааруулна.
 *
 * Тэр flag-ыг дуудлага бүрд санахын оронд энд нэг л удаа зохицуулна.
 */
export function LinkButton({
  href,
  children,
  ...props
}: Omit<ButtonProps, 'render' | 'nativeButton'> & {
  href: ComponentProps<typeof Link>['href'];
}) {
  return (
    <Button
      {...(props as ButtonPrimitive.Props)}
      nativeButton={false}
      render={<Link href={href} />}
    >
      {children}
    </Button>
  );
}
