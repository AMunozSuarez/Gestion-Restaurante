import React from 'react';
import Header from './Header';
import SocketOrderPrinter from './SocketOrderPrinter';

const Layout = ({ children }) => {
  return (
    <div className="h-screen bg-cream-50 font-poppins flex flex-col">
      <Header />
      <SocketOrderPrinter />
      <main className="flex-1 w-full overflow-hidden min-h-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;