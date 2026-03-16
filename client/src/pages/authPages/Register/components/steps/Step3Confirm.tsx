import { useEffect, useState } from 'react';
import type { step1Schema } from '../../../../../models/step1Schema';
import type { step2Schema } from '../../../../../models/step2Schema';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const backDomain = import.meta.env.VITE_BACKDOMAIN;

export default function Step3Confirm({
  setStep,
  form1,
  form2,
}: {
  setStep: React.Dispatch<React.SetStateAction<number>>;
  form1: step1Schema;
  form2: step2Schema;
}) {
  const navigateTo = useNavigate();

  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keyName = e.key;
      if (keyName === 'Escape') {
        setIsModalOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const avatarUrl = form1.avatar
    ? URL.createObjectURL(form1.avatar)
    : undefined;

  if (!form2) return null;

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-1 border-2 border-gray-500 rounded-[6px] p-2">
        <h3 className="text-center">Personal info</h3>
        <div>
          <span>Name: </span>
          <span>
            {form1.name} {form1.surname}
          </span>
        </div>
        <div>
          <span>Email: </span>
          <span>{form1.email}</span>
        </div>
        <div>
          <span>Avatar: </span>
          <img width={240} src={avatarUrl} />
        </div>
        <button type="button" onClick={() => setStep(0)}>
          Редактировать
        </button>
      </div>
      <div className="flex flex-col gap-y-1 border-2 border-gray-500 rounded-[6px] p-2">
        <h3 className="text-center">Account info</h3>
        {form2.type === 'personal' && (
          <div>
            Date of birth: {form2.dateOfBirth.getDate()}/
            {form2.dateOfBirth.getMonth()}/{form2.dateOfBirth.getFullYear()}
          </div>
        )}
        {form2.type === 'business' && (
          <div>
            <p>Company name: {form2.companyName}</p>
            <p>Inn: {form2.inn}</p>
            <p>
              Document: {form2.document?.name}
              <span>
                <svg
                  className="text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24px"
                  height="24px"
                  viewBox="0 0 15 15"
                  fill="none"
                >
                  <path
                    d="M2.5 6.5V6H2V6.5H2.5ZM6.5 6.5V6H6V6.5H6.5ZM6.5 10.5H6V11H6.5V10.5ZM13.5 3.5H14V3.29289L13.8536 3.14645L13.5 3.5ZM10.5 0.5L10.8536 0.146447L10.7071 0H10.5V0.5ZM2.5 7H3.5V6H2.5V7ZM3 11V8.5H2V11H3ZM3 8.5V6.5H2V8.5H3ZM3.5 8H2.5V9H3.5V8ZM4 7.5C4 7.77614 3.77614 8 3.5 8V9C4.32843 9 5 8.32843 5 7.5H4ZM3.5 7C3.77614 7 4 7.22386 4 7.5H5C5 6.67157 4.32843 6 3.5 6V7ZM6 6.5V10.5H7V6.5H6ZM6.5 11H7.5V10H6.5V11ZM9 9.5V7.5H8V9.5H9ZM7.5 6H6.5V7H7.5V6ZM9 7.5C9 6.67157 8.32843 6 7.5 6V7C7.77614 7 8 7.22386 8 7.5H9ZM7.5 11C8.32843 11 9 10.3284 9 9.5H8C8 9.77614 7.77614 10 7.5 10V11ZM10 6V11H11V6H10ZM10.5 7H13V6H10.5V7ZM10.5 9H12V8H10.5V9ZM2 5V1.5H1V5H2ZM13 3.5V5H14V3.5H13ZM2.5 1H10.5V0H2.5V1ZM10.1464 0.853553L13.1464 3.85355L13.8536 3.14645L10.8536 0.146447L10.1464 0.853553ZM2 1.5C2 1.22386 2.22386 1 2.5 1V0C1.67157 0 1 0.671573 1 1.5H2ZM1 12V13.5H2V12H1ZM2.5 15H12.5V14H2.5V15ZM14 13.5V12H13V13.5H14ZM12.5 15C13.3284 15 14 14.3284 14 13.5H13C13 13.7761 12.7761 14 12.5 14V15ZM1 13.5C1 14.3284 1.67157 15 2.5 15V14C2.22386 14 2 13.7761 2 13.5H1Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </p>
          </div>
        )}
        <button type="button" onClick={() => setStep(1)}>
          Редактировать
        </button>
      </div>
      <div>
        <input
          type="checkbox"
          id="Terms"
          name="Terms"
          onChange={(e) => {
            setIsChecked(e.target.checked);
          }}
        />
        <span>Я согласен с </span>
        <span className="underline" onClick={() => setIsModalOpen(true)}>
          условиями использования
        </span>
      </div>
      <div className="flex flex-row ml-auto mr-auto gap-x-2">
        <button
          className="border-2 border-gray-500 pl-2 pr-2"
          type="button"
          onClick={() => setStep(1)}
        >
          Prev
        </button>
        <button
          className={`border-2 border-gray-500 pl-2 pr-2 ${!isChecked ? 'bg-gray-600' : ''}`}
          disabled={!isChecked || isLoading}
          type="submit"
          onClick={async () => {
            const formData = new FormData();
            formData.append('username', form1.email);
            formData.append('password', form1.password);
            console.log(formData);
            try {
              setIsLoading(true);
              const res = await fetch(`${backDomain}/api/register`, {
                method: 'POST',
                body: formData,
              });

              const result = await res.json();
              if (!res.ok) {
                setServerError(result.error);

                return;
              }
              console.log('Succes: ', result);
              navigateTo('/dashboard');
            } catch (err) {
              console.log('Ошибка ', err);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          Submit{' '}
          {isLoading && (
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
        </button>
        {serverError && <p className="text-red-500">{serverError}</p>}
      </div>
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center"
            onClick={() => setIsModalOpen(false)}
          >
            <div className="bg-white p-4">
              <div
                className="w-full flex justify-end"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <div
                  className="text-black"
                  onClick={() => setIsModalOpen(false)}
                >
                  x
                </div>
              </div>
              <p className="text-black">Твоя душа принадлежит мне</p>
            </div>
          </div>,
          document.getElementById('modal')!,
        )}
    </div>
  );
}
