import { ReactNode } from 'react';

interface MobileContainerProps {
  children: ReactNode;
}

export function MobileContainer({ children }: MobileContainerProps) {
  return (
    <div className="w-full h-screen max-w-[430px] mx-auto relative overflow-hidden bg-white shadow-2xl">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      {children}
    </div>
  );
}
