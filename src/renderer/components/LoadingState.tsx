export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}
