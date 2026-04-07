export interface AccountTypeFormValues {
    accountType?: 'personal' | 'business';
    companyName?: string;
    inn?: string;
    document?: FileList;
};

export interface ConfirmationFromProps {
    data?: any;
    onBack?: () => void;
    onSubmit?: (data: any) => void;
    onEditStep?: (step: number) => void;
};

export interface UploadFileProps {
    label?: string;
    accept?: string;
    value: File | null;
    onChange: (file: File | null) => void;
    onBlur?: () => void;
    error?: boolean;
    helperText?: string;
};

export type ServerFieldError = {
    field: string;
    message: string;
    nonce: number;
};

export interface UseEmailAvailabilityArgs {
    getEmail: (email: string) => Promise<boolean>;
    debounceMs?: number;
};

export type FieldError = { field: string; message: string; nonce: number };