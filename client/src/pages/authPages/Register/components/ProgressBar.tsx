export default function ProgressBar({ step }: { step: number }) {
  let step1 = '';
  let step2 = '';
  let step3 = '';
  if (step === 0) {
    step1 = 'bg-blue-500';
    step2 = 'bg-gray-500';
    step3 = 'bg-gray-500';
  } else if (step === 1) {
    step1 = 'bg-green-500';
    step2 = 'bg-blue-500';
    step3 = 'bg-gray-500';
  } else if (step === 2) {
    step1 = 'bg-green-500';
    step2 = 'bg-green-500';
    step3 = 'bg-blue-500';
  }
  return (
    <div className="flex flex-row gap-x-[24px] justify-center items-end">
      <div className="step1 flex flex-col justify-center items-center">
        {step > 0 && (
          <svg
            className="text-green-500"
            width="16px"
            height="16px"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            fill="#00ff11"
            stroke="#00ff11"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              <path
                fill="currentColor"
                d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm-55.808 536.384-99.52-99.584a38.4 38.4 0 1 0-54.336 54.336l126.72 126.72a38.272 38.272 0 0 0 54.336 0l262.4-262.464a38.4 38.4 0 1 0-54.272-54.336L456.192 600.384z"
              ></path>
            </g>
          </svg>
        )}
        <div>Account info</div>
        <div className={`w-24 h-[6px] rounded-[10px] ${step1}`}></div>
      </div>
      <div className="step2 flex flex-col justify-center items-center">
        {step > 1 && (
          <svg
            className="text-green-500"
            width="16px"
            height="16px"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            fill="#00ff11"
            stroke="#00ff11"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              <path
                fill="currentColor"
                d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm-55.808 536.384-99.52-99.584a38.4 38.4 0 1 0-54.336 54.336l126.72 126.72a38.272 38.272 0 0 0 54.336 0l262.4-262.464a38.4 38.4 0 1 0-54.272-54.336L456.192 600.384z"
              ></path>
            </g>
          </svg>
        )}
        <div>Personal info</div>
        <div className={`w-24 h-[6px] rounded-[10px] ${step2}`}></div>
      </div>
      <div className="step3 flex flex-col justify-center items-center">
        {step > 2 && (
          <svg
            className="text-green-500"
            width="16px"
            height="16px"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            fill="#00ff11"
            stroke="#00ff11"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              <path
                fill="currentColor"
                d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm-55.808 536.384-99.52-99.584a38.4 38.4 0 1 0-54.336 54.336l126.72 126.72a38.272 38.272 0 0 0 54.336 0l262.4-262.464a38.4 38.4 0 1 0-54.272-54.336L456.192 600.384z"
              ></path>
            </g>
          </svg>
        )}
        <div>Confirmation</div>
        <div className={`w-24 h-[6px] rounded-[10px] ${step3}`}></div>
      </div>
    </div>
  );
}
