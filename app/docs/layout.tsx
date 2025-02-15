export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}

// Disable header and footer for docs page
DocsLayout.hideHeader = true;
DocsLayout.hideFooter = true; 