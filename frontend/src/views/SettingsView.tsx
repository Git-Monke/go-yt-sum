import { useState, useEffect } from 'react';
import { getSettings, updateSettings, getAvailableModels } from '@/utils/api';
import type { Settings, GroqModel } from '@/utils/api';
import { toast } from 'sonner';

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [models, setModels] = useState<GroqModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsData, modelsData] = await Promise.all([
          getSettings(),
          getAvailableModels()
        ]);
        setSettings(settingsData);
        // Filter for chat models, though user said "show everything"
        // Groq models sometimes include whisper, we might want to separate them but user said "just show everything"
        setModels(modelsData.data);
      } catch (error) {
        console.error('Failed to fetch settings or models:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSettingChange = async (key: keyof Settings, value: string) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await updateSettings(newSettings);
      toast.success('Settings updated');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

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
            <h2 className="text-lg font-semibold mb-4">Model Configuration</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Select which Groq models to use for different tasks
            </p>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium block">Summarization Model</label>
                <select 
                  className="w-full p-2 rounded-md border bg-background text-sm"
                  value={settings?.summarizationModel}
                  onChange={(e) => handleSettingChange('summarizationModel', e.target.value)}
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Model used for generating video summaries
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Chat Model</label>
                <select 
                  className="w-full p-2 rounded-md border bg-background text-sm"
                  value={settings?.chatModel}
                  onChange={(e) => handleSettingChange('chatModel', e.target.value)}
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Model used for the interactive chat
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Transcription Model</label>
                <select 
                  className="w-full p-2 rounded-md border bg-background text-sm"
                  value={settings?.transcriptionModel}
                  onChange={(e) => handleSettingChange('transcriptionModel', e.target.value)}
                >
                  {models.filter(m => m.id.includes('whisper')).map(model => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Model used for audio transcription (Whisper)
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6 opacity-50">
            <h2 className="text-lg font-semibold mb-4">General Preferences</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Additional application settings
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Theme</label>
                <p className="text-xs text-muted-foreground italic">
                  Theme selection is managed by system preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
