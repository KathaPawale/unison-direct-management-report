// src/components/AnimatedToggleSwitch.jsx

import React from 'react';

// This is the component you will import and use.
// It accepts `isChecked`, `onToggle` and an optional `size` prop.
export default function AnimatedToggleSwitch({
  isChecked,
  onToggle,
  size = 50,
  className = '',
}) {
  // This data array holds the unique animation properties for each sparkle.
  const sparkles = [
    { w: 2, d: 25, dur: 11 },
    { w: 1, d: 100, dur: 18 },
    { w: 1, d: 280, dur: 5 },
    { w: 2, d: 200, dur: 3 },
    { w: 2, d: 30, dur: 20 },
    { w: 2, d: 300, dur: 9 },
    { w: 1, d: 250, dur: 4 },
    { w: 2, d: 210, dur: 8 },
    { w: 2, d: 100, dur: 9 },
    { w: 1, d: 15, dur: 13 },
    { w: 1, d: 75, dur: 18 },
    { w: 2, d: 65, dur: 6 },
    { w: 2, d: 50, dur: 7 },
    { w: 1, d: 320, dur: 5 },
    { w: 1, d: 220, dur: 5 },
    { w: 1, d: 215, dur: 2 },
    { w: 2, d: 135, dur: 9 },
    { w: 2, d: 45, dur: 4 },
    { w: 1, d: 78, dur: 16 },
    { w: 1, d: 89, dur: 19 },
    { w: 2, d: 65, dur: 14 },
    { w: 2, d: 97, dur: 1 },
    { w: 1, d: 174, dur: 10 },
    { w: 1, d: 236, dur: 5 },
  ];

  return (
    <>
      {/* 
        This <style> tag contains the ORIGINAL, WORKING CSS, with one key change:
        All fixed pixel values have been replaced with calculations based on a
        CSS variable `--switch-size` to make the component resizable.
      */}
      <style>
        {`
          .toggle-cont {
            --primary: #54a8fc; --light: #d9d9d9; --dark: #121212; --gray: #414344;
            position: relative; z-index: 10; width: fit-content;
            height: var(--switch-size);
            border-radius: 9999px;
          }
          .toggle-cont .toggle-input { display: none; }
          .toggle-cont .toggle-label {
            --gap: calc(var(--switch-size) * 0.1);
            --width: var(--switch-size);
            cursor: pointer; position: relative; display: inline-block;
            padding: calc(var(--switch-size) * 0.1);
            width: calc((var(--width) + var(--gap)) * 2);
            height: 100%;
            background-color: var(--dark);
            border: 1px solid #777777;
            border-bottom: 0;
            border-radius: 9999px;
            box-sizing: content-box;
            transition: all 0.3s ease-in-out;
          }
          .toggle-label::before {
            content: ""; position: absolute; z-index: -10; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: calc(100% + var(--switch-size) * 0.3);
            height: calc(100% + var(--switch-size) * 0.3);
            background-color: var(--gray);
            border: 1px solid #777777;
            border-bottom: 0;
            border-radius: 9999px;
            transition: all 0.3s ease-in-out;
          }
          .toggle-label::after {
            content: ""; position: absolute; z-index: -10; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 100%; height: 100%;
            background-image: radial-gradient(circle at 50% -100%, rgb(58, 155, 252) 0%, rgba(12, 12, 12, 1) 80%);
            border-radius: 9999px;
          }
          .toggle-cont .toggle-label .cont-icon {
            position: relative; display: flex; justify-content: center; align-items: center;
            width: var(--width);
            height: var(--switch-size);
            background-image: radial-gradient(circle at 50% 0%, #666666 0%, var(--gray) 100%);
            border: 1px solid #aaaaaa;
            border-bottom: 0;
            border-radius: 9999px;
            box-shadow: inset 0 -0.03em 0.03em var(--primary);
            transition: transform 0.3s ease-in-out;
            overflow: clip;
          }
          .cont-icon .sparkle {
            position: absolute; top: 50%; left: 50%; display: block;
            width: calc(var(--width) * 0.02 * var(--sparkle-w));
            aspect-ratio: 1;
            background-color: var(--light);
            border-radius: 50%;
            transform-origin: 50% 50%;
            rotate: calc(1deg * var(--deg));
            transform: translate(-50%, -50%);
            animation: sparkle-anim calc(100s / var(--duration)) linear calc(0s / var(--duration)) infinite;
          }
          @keyframes sparkle-anim {
            to {
              width: calc(var(--width) * 0.01 * var(--sparkle-w));
              transform: translate(2000%, -50%);
              opacity: 0;
            }
          }
          .cont-icon .icon {
            width: calc(var(--switch-size) * 0.36);
            fill: var(--light);
          }
          .toggle-cont:has(.toggle-input:checked) .toggle-label {
            background-color: #41434400;
            border: 1px solid #3d6970;
            border-bottom: 0;
          }
          .toggle-cont:has(.toggle-input:checked) .toggle-label::before {
            box-shadow: 0 0.2em 0.5em -0.4em #0080ff;
          }
          .toggle-cont:has(.toggle-input:checked) .toggle-label .cont-icon {
            overflow: visible;
            background-image: radial-gradient(circle at 50% 0%, #045ab1 0%, var(--primary) 100%);
            border: 1px solid var(--primary);
            border-bottom: 0;
            transform: translateX(calc((var(--gap) * 2) + 100%)) rotate(-225deg);
          }
          .toggle-cont:has(.toggle-input:checked) .toggle-label .cont-icon .sparkle {
            z-index: -10;
            width: calc(var(--width) * 0.03 * var(--sparkle-w));
            background-color: #acacac;
            animation-name: sparkle-checked-anim;
            animation-delay: calc(10s / var(--duration));
          }
          @keyframes sparkle-checked-anim {
            to {
              width: calc(var(--width) * 0.02 * var(--sparkle-w));
              transform: translate(5000%, -50%);
              opacity: 0;
            }
          }
        `}
      </style>

      {/* The component's root div now has an inline style to set the CSS variable */}
      <div
        className={`toggle-cont ${className}`}
        style={{ '--switch-size': `${size}px` }}
      >
        <input
          className='toggle-input'
          id='animated-toggle'
          name='toggle'
          type='checkbox'
          checked={isChecked}
          onChange={onToggle}
        />
        <label className='toggle-label' htmlFor='animated-toggle'>
          <div className='cont-icon'>
            {sparkles.map((s, i) => (
              <span
                key={i}
                className='sparkle'
                style={{
                  '--sparkle-w': s.w,
                  '--deg': s.d,
                  '--duration': s.dur,
                }}
              />
            ))}
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 30 30'
              className='icon'
            >
              <path d='M0.96233 28.61C1.36043 29.0081 1.96007 29.1255 2.47555 28.8971L10.4256 25.3552C13.2236 24.11 16.4254 24.1425 19.2107 25.4401L27.4152 29.2747C27.476 29.3044 27.5418 29.3023 27.6047 29.32C27.6563 29.3348 27.7079 29.3497 27.761 29.3574C27.843 29.3687 27.9194 29.3758 28 29.3688C28.1273 29.3617 28.2531 29.3405 28.3726 29.2945C28.4447 29.262 28.5162 29.2287 28.5749 29.1842C28.6399 29.1446 28.6993 29.0994 28.7509 29.0477L28.9008 28.8582C28.9468 28.7995 28.9793 28.7274 29.0112 28.656C29.0599 28.5322 29.0811 28.4036 29.0882 28.2734C29.0939 28.1957 29.0868 28.1207 29.0769 28.0415C29.0705 27.9955 29.0585 27.9524 29.0472 27.9072C29.0295 27.8343 29.0302 27.7601 28.9984 27.6901L25.1638 19.4855C23.8592 16.7073 23.8273 13.5048 25.0726 10.7068L28.6145 2.75679C28.8429 2.24131 28.7318 1.63531 28.3337 1.2372C27.9165 0.820011 27.271 0.721743 26.7491 0.9961L19.8357 4.59596C16.8418 6.15442 13.2879 6.18696 10.2615 4.70062L1.80308 0.520214C1.7055 0.474959 1.60722 0.441742 1.50964 0.421943C1.44459 0.409215 1.37882 0.395769 1.3074 0.402133C1.14406 0.395769 0.981436 0.428275 0.818095 0.499692C0.77284 0.519491 0.719805 0.545671 0.67455 0.578198C0.596061 0.617088 0.524653 0.675786 0.4596 0.74084C0.394546 0.805894 0.335843 0.877306 0.296245 0.956502C0.263718 1.00176 0.237561 1.05477 0.217762 1.10003C0.152708 1.24286 0.126545 1.40058 0.120181 1.54978C0.120181 1.61483 0.126527 1.6735 0.132891 1.73219C0.15269 1.85664 0.178881 1.97332 0.237571 2.08434L4.41798 10.5427C5.91139 13.5621 5.8725 17.1238 4.3204 20.1099L0.720514 27.0233C0.440499 27.5536 0.545137 28.1928 0.96233 28.61Z' />
            </svg>
          </div>
        </label>
      </div>
    </>
  );
}
