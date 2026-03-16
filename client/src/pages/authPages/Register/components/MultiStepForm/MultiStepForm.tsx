import { useState } from 'react';
import Step1Personal from '../steps/Step1Personal';
import Step2Account from '../steps/Step2Account';
import Step3Confirm from '../steps/Step3Confirm';
import type { step1Schema } from '../../../../../models/step1Schema';
import type { step2Schema } from '../../../../../models/step2Schema';
import ProgressBar from '../ProgressBar';

export default function MultiStepForm() {
  const [step, setStep] = useState<number>(0);
  const [form1, setForm1] = useState<step1Schema | null>(null);
  const [form2, setForm2] = useState<step2Schema | null>(null);

  return (
    <div className="flex flex-col border-4 border-pink-900 p-10 rounded-[10px]">
      <ProgressBar step={step} />
      <div>
        <h2 className="text-center text-2xl mt-4 mb-4">Registation</h2>
        {step === 0 && (
          <Step1Personal
            setStep={setStep}
            setForm={setForm1}
            form1Data={form1}
          />
        )}
        {step === 1 && (
          <Step2Account
            setStep={setStep}
            setForm={setForm2}
            form2Data={form2}
          />
        )}
        {step === 2 && form1 && form2 && (
          <Step3Confirm setStep={setStep} form1={form1} form2={form2} />
        )}
      </div>
    </div>
  );
}
