import { useForm } from 'react-hook-form';
import {
  step2SchemaObj,
  type step2Schema,
} from '../../../../../models/step2Schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import useDebounce from '../../../../../utility/hooks/useDebounce';

const backDomain = import.meta.env.VITE_BACKDOMAIN;

export default function Step2Account({
  setStep,
  setForm,
  form2Data,
}: {
  setStep: React.Dispatch<React.SetStateAction<number>>;
  setForm: React.Dispatch<React.SetStateAction<step2Schema | null>>;
  form2Data: step2Schema | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    resetField,
  } = useForm({
    resolver: zodResolver(step2SchemaObj),
    mode: 'onBlur',
    defaultValues: { ...form2Data, document: undefined } as any,
  });

  const type = watch('type');

  const [file, setFile] = useState<File | null>(null);

  const [innTaken, setInnTaken] = useState<boolean>(false);
  const [isCheking, setIsChecking] = useState<boolean>(false);

  const [innTerm, setInnTerm] = useState<string>(
    form2Data?.type === 'business' ? form2Data.inn : '',
  );
  const debouncedInn = useDebounce(innTerm, 500);

  const lastCheckedInn = useRef(
    form2Data?.type === 'business' ? form2Data.inn : '',
  );

  const { onChange: onInnChange, ...innRest } = register('inn');
  const { onChange: onDocumentChange, ...documentRest } = register('document');

  useEffect(() => {
    if (debouncedInn === lastCheckedInn.current) return;
    if (debouncedInn.length === 8 || debouncedInn.length === 10) {
      setInnTaken(false);
      const checkInn = async () => {
        if (debouncedInn !== '') {
          setIsChecking(true);
          await new Promise((r) => setTimeout(r, 2000)); // для теста
          const response = await fetch(
            `${backDomain}/api/check-inn?inn=${debouncedInn}`,
            {
              method: 'GET',
            },
          );
          const data = await response.json();
          if (data.valid === true) {
            setInnTaken(false);
          } else if (data.valid === false) {
            setInnTaken(true);
          } else {
            setInnTaken(false);
          }
          setIsChecking(false);
        }
        lastCheckedInn.current = debouncedInn;
      };
      checkInn();
    } else {
      return;
    }
  }, [debouncedInn]);

  const typedErrors = errors as any;

  return (
    <div>
      <form
        className="flex flex-col gap-y-1.5"
        onSubmit={handleSubmit((data) => {
          setForm(data);
          setStep(2);
        })}
      >
        <div className="flex flex-col">
          <p>Выберите тип аккаунта: </p>
          <div>
            <input
              {...register('type')}
              type="radio"
              id="personal"
              value="personal"
            />
            <label htmlFor="personal">Personal</label>
          </div>
          <div>
            <input
              {...register('type')}
              type="radio"
              id="business"
              value="business"
            />
            <label htmlFor="business">Business</label>
          </div>
          <p className="text-red-500">{errors.root?.type}</p>
        </div>
        {type === 'personal' && (
          <div className="flex flex-row border-2 border-gray-500  p-1.5 rounded-[4px]">
            <p className="mr-2">Дата рождения:</p>
            <input
              {...register('dateOfBirth', { valueAsDate: true })}
              type="date"
            />
            <p className="text-red-500">{typedErrors.dateOfBirth?.message}</p>
          </div>
        )}
        {type === 'business' && (
          <div className="flex flex-col">
            <label>
              <div className="border-2 border-gray-500  p-1.5 rounded-[4px]">
                <span>Название компании: </span>
                <input {...register('companyName')} />
              </div>
              <p className="text-red-500">{typedErrors.companyName?.message}</p>
            </label>
            <label>
              <div className="flex flex-row items-center border-2 border-gray-500  p-1.5 rounded-[4px]">
                <span>ЄДРПОУ / ІПН: </span>
                <input
                  {...innRest}
                  value={innTerm}
                  onChange={(e) => {
                    setInnTaken(false);
                    onInnChange(e);
                    setInnTerm(e.target.value);
                  }}
                />
                {isCheking && (
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full ml-2" />
                )}
              </div>
              <p className="text-red-500">{typedErrors.inn?.message}</p>
              {innTaken && <p className="text-red-500">Inn taken</p>}
            </label>
            <label>
              <div className="border-2 border-gray-500  p-1.5 rounded-[4px]">
                <span>Документ компании: </span>
                <p>
                  <input
                    {...documentRest}
                    onChange={(e) => {
                      onDocumentChange(e);
                      const file = e.target.files?.item(0);
                      if (file) {
                        setFile(file);
                      } else {
                      }
                    }}
                    type="file"
                  />
                </p>
                {file && (
                  <div className="flex flex-row gap-x-2 mt-2">
                    <span>File name: {file?.name}</span>
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
                  </div>
                )}
                {file && (
                  <p>
                    File size: {file !== null && file?.size / 1024 / 1024} MB
                  </p>
                )}
              </div>
            </label>
            {file && (
              <button
                className="mt-1"
                onClick={() => {
                  setFile(null);
                  resetField('document');
                }}
                type="button"
              >
                Удалить файл
              </button>
            )}
          </div>
        )}
        <div className="flex flex-row mr-auto ml-auto gap-2">
          <button
            className="border-2 border-gray-500 pl-2 pr-2"
            type="button"
            onClick={() => setStep(0)}
          >
            Prev
          </button>
          <button
            className={`border-2 border-gray-500 pl-2 pr-2 ${!isValid || isCheking ? 'bg-gray-600' : ''}`}
            type="submit"
            // disabled={!isValid || innTaken || isCheking}
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
