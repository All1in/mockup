# Архітектура Stripe payments

## Поточне рішення

Модуль реалізовано як окремий bounded context:

- `PaymentController` — HTTP contract, error mapping, raw webhook handling.
- `PaymentService` — application orchestration: order creation, idempotency, provider sync, webhook processing.
- `PaymentRequestPolicy` — валідація і нормалізація вхідних payment-запитів.
- `StripePaymentGateway` — адаптер над Stripe SDK; домен не залежить від Stripe types.
- `PaymentOrderRepository` / `PaymentEventRepository` — Mongo persistence і mapping до domain entities.
- Frontend `PaymentCheckout` — React Stripe.js `Elements` + `PaymentElement`, без ручного створення iframe.

## Чому PaymentIntent + PaymentElement

PaymentIntent відображає намір списати кошти та має статусну модель (`requires_action`, `processing`, `succeeded`, `requires_payment_method`, `canceled`). PaymentElement дає Stripe-керований iframe для збору платіжних даних, тому PAN/CVC не проходять через наш сервер і ми не беремо зайвий PCI scope.

Для складнішого commerce flow Checkout Sessions зазвичай дешевше підтримувати: line items, tax, discounts, shipping, subscriptions, Adaptive Pricing. PaymentIntent лишає більше контролю, але вимагає більше коду, webhook discipline і власної order state machine.

## Ідемпотентність

Є два рівні захисту:

- Mongo unique index: `userId + idempotencyKey`. Один checkout attempt не створить два локальні order.
- Stripe idempotency key: `payment-intent:${userId}:${idempotencyKey}`. Retry через network failure не створить другий PaymentIntent.

Якщо той самий idempotency key приходить з іншою сумою або валютою, API повертає `409`. Це важливо: silent reuse з іншими параметрами маскує race condition або frontend bug.

## Webhook як фінальна правда

Клієнтський redirect/return page не є доказом оплати. Фінальний paid state виставляється через webhook `payment_intent.succeeded`. Return page лише читає `/payments/orders/:orderId`, а сервер за потреби синхронізує non-terminal intent зі Stripe.

Webhook event id записується у `PaymentEvent` після успішного застосування доменної зміни, тому повторні delivery від Stripe не дублюють state transition, але retry не блокується передчасним audit-записом.

## 3DS та iframe lifecycle

Production-підхід: дати Stripe.js керувати 3DS через `stripe.confirmPayment({ elements, confirmParams: { return_url } })`. У фронтенді:

- `loadStripe` кешується поза render path (`stripe-client.ts`), щоб не створювати новий Stripe object на кожний render.
- `Elements` отримує стабільний `stripePromise`; `stripe` prop після mount не змінюється.
- `Elements` має `key={clientSecret}` тільки для нового PaymentIntent. Не використовуємо `Date.now()`, random key або conditional mount на кожну зміну loading state.
- `PaymentElement` монтується один раз всередині одного `Elements` tree. Не створюємо iframe вручну і не зберігаємо DOM ref як source of truth.
- `submittingRef` блокує подвійний `confirmPayment`.
- `mountedRef` не дозволяє `setState` після unmount.
- `AbortController` скасовує створення PaymentIntent при unmount/новій спробі.

Якщо колись доведеться вручну показувати 3DS iframe через `next_action.redirect_to_url`, потрібен окремий `ThreeDSFrameController`: один контейнер, один iframe, cleanup `message` listener, перевірка origin/data у `postMessage`, видалення iframe на завершення/timeout/unmount. Не ставити `sandbox` на 3DS iframe.

## Edge cases

- Подвійний клік на `Start payment`: idempotency key стабільний у `useRef`, Stripe/Mongo повернуть той самий intent.
- Подвійний клік на `Pay`: `submittingRef` блокує другий `confirmPayment`.
- User reload після створення intent: поточна demo-сторінка створить новий checkout attempt. Для реального cart потрібно зберігати active order id у checkout state або створювати intent від server-owned cart id.
- User пішов зі сторінки під час 3DS: webhook все одно оновить статус; return page не є єдиним джерелом.
- Stripe webhook прийшов раніше за відповідь create intent: order уже створений до provider call, metadata містить `appOrderId`.
- Webhook без локального order для metadata id: повертаємо 500, щоб Stripe retry дав шанс БД наздогнати. Для старих/міграційних подій можна додати allowlist або dead-letter.
- `processing`: для async payment methods це нормальний стан, не failed.
- `requires_payment_method`: клієнт має дати користувачу нову payment method; order не paid.
- `requires_capture`: для manual capture це authorized, але не captured. Зараз capture automatic; якщо перейти на manual, потрібні окремі endpoints і ризик expiry authorization.
- Ціна з клієнта: у demo це допустимо, у production сума має рахуватися з server-owned cart/price table, а не з request body.
- Secrets: `clientSecret` не логувати й не зберігати; віддавати тільки authenticated власнику order.

## Безкоштовність

Для розробки використовується Stripe sandbox/test mode: тестові ключі і тестові картки не рухають реальні кошти. Live mode не безкоштовний: Stripe бере комісію за успішні платежі, і потрібна активована merchant-конфігурація.
