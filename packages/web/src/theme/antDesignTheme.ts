import type { ConfigProviderProps } from 'ant-design-vue';

/**
 * Ant Design Vue bridge for the product tokens declared in assets/main.css.
 * Keep this intentionally small: product CSS variables remain the visual source
 * of truth, while these values seed Ant Design Vue's generated component styles.
 */
export const antDesignTheme: NonNullable<ConfigProviderProps['theme']> = {
  token: {
    colorPrimary: '#2563eb',
    colorSuccess: '#059669',
    colorWarning: '#f97316',
    colorError: '#dc2626',
    colorText: '#172033',
    colorTextSecondary: '#667085',
    colorBorder: '#e8ebf0',
    colorBgContainer: '#ffffff',
    borderRadius: 10,
    controlHeight: 40,
    fontSize: 13,
    fontFamily: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    boxShadowSecondary: '0 4px 14px rgba(16, 24, 40, .05)',
  },
  components: {
    Button: {
      borderRadius: 8,
    },
  },
};
