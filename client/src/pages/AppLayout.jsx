import { Outlet } from "react-router-dom";

function AppLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-background">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-lg font-semibold">Zervo Gym</h1>
        </div>

        <nav className="p-4">{/* Navigation will be added here */}</nav>
      </aside>

      {/* Main application area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">Gym Management</h2>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-muted/40 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
