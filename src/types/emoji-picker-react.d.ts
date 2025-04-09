declare module 'emoji-picker-react' {
  import { FunctionComponent } from 'react';

  export interface EmojiClickData {
    emoji: string;
    names: string[];
    unified: string;
    originalUnified: string;
    activeSkinTone: string;
  }

  export interface EmojiPickerProps {
    onEmojiClick?: (emojiData: EmojiClickData, event: MouseEvent) => void;
    autoFocusSearch?: boolean;
    width?: number | string;
    height?: number | string;
    theme?: 'light' | 'dark' | 'auto';
    searchPlaceholder?: string;
    previewConfig?: {
      defaultCaption: string;
      defaultEmoji: string;
    };
    skinTonePickerLocation?: 'preview' | 'search';
    defaultSkinTone?: string;
    categories?: string[];
    searchDisabled?: boolean;
    lazyLoadEmojis?: boolean;
    customEmojis?: Array<{
      names: string[];
      imgUrl: string;
      id: string;
    }>;
  }

  const EmojiPicker: FunctionComponent<EmojiPickerProps>;
  
  export default EmojiPicker;
} 