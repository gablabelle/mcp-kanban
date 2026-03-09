export interface ProviderAdapter {
  id: string;
  name: string;
  detect(): Promise<boolean>;
  install(): Promise<void>;
  uninstall(): Promise<void>;
  verify(): Promise<boolean>;
}
