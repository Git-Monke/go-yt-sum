export default function SettingsView() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your application preferences
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">API Configuration</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure API keys and service endpoints
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Groq API Key</label>
                <p className="text-xs text-muted-foreground">
                  Settings form with input fields will be implemented here
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Preferences</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Customize your experience
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Theme</label>
                <p className="text-xs text-muted-foreground">
                  Theme selection will be implemented here
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}