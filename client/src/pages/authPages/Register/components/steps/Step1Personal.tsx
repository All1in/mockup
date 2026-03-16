import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  step1SchemaObj,
  type step1Schema,
} from '../../../../../models/step1Schema';
import { useEffect, useRef, useState } from 'react';
import useDebounce from '../../../../../utility/hooks/useDebounce';

const backDomain = import.meta.env.VITE_BACKDOMAIN;

export default function Step1Personal({
  setStep,
  setForm,
  form1Data,
}: {
  setStep: React.Dispatch<React.SetStateAction<number>>;
  setForm: React.Dispatch<React.SetStateAction<step1Schema | null>>;
  form1Data: step1Schema | null;
}) {
  const [previewAvatar, setPreviewAvatar] = useState<null | string>(null);
  const [file, setFile] = useState<File | null>(null);
  const [emailTaken, setEmailTaken] = useState<boolean>(false);
  const [isCheking, setIsChecking] = useState<boolean>(false);

  const [emailTerm, setEmailTerm] = useState<string>(form1Data?.email ?? '');
  const debouncedEmail = useDebounce(emailTerm, 500);

  const lastCheckedEmail = useRef(form1Data?.email ?? '');

  const {
    register,
    handleSubmit,
    resetField,
    watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(step1SchemaObj),
    mode: 'onBlur',
    defaultValues: { ...form1Data, avatar: undefined },
  });

  const passwordValue = watch('password') ?? '';

  const hasMinLength = passwordValue.length >= 8;
  const hasNumber = /\d/.test(passwordValue);
  const hasUpperCase = /[A-Z]/.test(passwordValue);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue);

  const handleAvatarPreview = (image: Blob | MediaSource) => {
    const urlPrev = URL.createObjectURL(image);
    setPreviewAvatar(urlPrev);
  };

  useEffect(() => {
    if (debouncedEmail === lastCheckedEmail.current) return;
    const checkEmail = async () => {
      if (debouncedEmail !== '') {
        setIsChecking(true);

        const response = await fetch(
          `${backDomain}/auth/check-email?email=${debouncedEmail}`,
          {
            method: 'GET',
          },
        );
        const data = await response.json();
        if (data.available === false) {
          setEmailTaken(true);
        } else {
          setEmailTaken(false);
        }
        setIsChecking(false);
      }
      lastCheckedEmail.current = debouncedEmail;
    };
    checkEmail();
  }, [debouncedEmail]);

  const { onChange: onAvatarChange, ...avatarRest } = register('avatar');
  const { onChange: onEmailChange, ...emailRest } = register('email');

  return (
    <>
      <form
        className="flex flex-col gap-y-1.5"
        onSubmit={handleSubmit((data) => {
          setStep(1);
          setForm(data);
        })}
      >
        <label>
          <div className="flex flex-row  border-2 border-gray-500  p-1.5 rounded-[4px]">
            <span>Name: </span>
            <input className="w-full" {...register('name')} />
          </div>
          <p className="text-red-500">{errors.name?.message}</p>
        </label>
        <label>
          <div className="flex flex-row  border-2 border-gray-500  p-1.5 rounded-[4px]">
            <span>Surname: </span>
            <input className="w-full" {...register('surname')} />
          </div>
          <p className="text-red-500">{errors.surname?.message}</p>
        </label>
        <label>
          <div className="flex flex-row border-2 items-center border-gray-500  p-1.5 rounded-[4px]">
            <span>Email: </span>
            <input
              className="w-full"
              {...emailRest}
              value={emailTerm}
              onChange={(e) => {
                onEmailChange(e);
                setEmailTerm(e.target.value);
              }}
            />
          </div>
          {isCheking && (
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full ml-2" />
          )}
          <p className="text-red-500">{errors.email?.message}</p>
          {emailTaken && <p className="text-red-500">Email taken</p>}
        </label>
        <label>
          <div className="flex flex-row  border-2 border-gray-500  p-1.5 rounded-[4px]">
            <span>Password: </span>
            <input className="w-full" {...register('password')} />
          </div>
          {passwordValue !== '' && !hasMinLength && (
            <p className="text-red-500">
              Пароль должен содержать минимум 8 символов
            </p>
          )}
          {passwordValue !== '' && !hasNumber && (
            <p className="text-red-500">Пароль должен содержать число</p>
          )}
          {passwordValue !== '' && !hasSpecial && (
            <p className="text-red-500">
              Пароль должен содержать специальный символ
            </p>
          )}
          {passwordValue !== '' && !hasUpperCase && (
            <p className="text-red-500">
              Пароль должен содержать заглавную букву
            </p>
          )}
        </label>
        <label>
          <div className="flex flex-row border-2 border-gray-500  p-1.5 rounded-[4px]">
            <span className="whitespace-nowrap">Confirm password: </span>
            <input className="w-full" {...register('confirmPassword')} />
          </div>
          <p className="text-red-500">{errors.confirmPassword?.message}</p>
        </label>
        <label>
          <div className="border-2 border-gray-500  p-1.5 rounded-[4px]">
            <span>Avatar: </span>
            <input
              type="file"
              {...avatarRest}
              accept="image/png, image/jpeg"
              onChange={(e) => {
                onAvatarChange(e);
                const file = e.target.files?.item(0);
                if (file) {
                  handleAvatarPreview(file);
                  setFile(file);
                }
              }}
            />
            {previewAvatar !== null && (
              <img className="mt-1" width={240} src={previewAvatar} />
            )}
            {previewAvatar !== null && <p>File name: {file?.name}</p>}
            {previewAvatar !== null && (
              <p>File size: {file !== null && file?.size / 1024 / 1024} MB</p>
            )}
            <p className="text-red-500">{errors.avatar?.message}</p>
          </div>
        </label>
        {previewAvatar !== null && (
          <button
            onClick={() => {
              setPreviewAvatar(null);
              setFile(null);
              resetField('avatar');
            }}
            type="button"
          >
            Удалить
          </button>
        )}
        <button
          disabled={!isValid || emailTaken || isCheking}
          className={`border-2 p-2 border-gray-500 ${!isValid || emailTaken || isCheking ? 'bg-gray-600' : ''}`}
          type="submit"
        >
          Next step
        </button>
      </form>
    </>
  );
}
