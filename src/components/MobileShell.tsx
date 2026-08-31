import React from 'react';

interface MobileShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  hideHeaderPadding?: boolean;
  hideFooterPadding?: boolean;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  header,
  footer,
  hideHeaderPadding = false,
  hideFooterPadding = false,
}) => {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-[430px] h-screen sm:h-[880px] bg-slate-50 relative flex flex-col overflow-hidden border border-slate-300 sm:rounded-2xl shadow-none">
        {/* Top Docked Header Slot */}
        {header && (
          <div className="absolute top-0 left-0 right-0 w-full h-14 bg-white border-b border-slate-200 z-30 flex items-center px-4">
            {header}
          </div>
        )}

        {/* Scrollable Body Area */}
        <div
          className={`flex-1 w-full overflow-y-auto relative z-10 ${
            header && !hideHeaderPadding ? 'pt-14' : ''
          } ${footer && !hideFooterPadding ? 'pb-16' : ''}`}
        >
          {children}
        </div>

        {/* Bottom Docked Navigation Slot */}
        {footer && (
          <div className="absolute bottom-0 left-0 right-0 w-full h-16 bg-white border-t border-slate-200 z-30 flex items-center justify-around">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
