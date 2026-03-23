'use client';

import { FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter, FaFacebookF } from 'react-icons/fa6';
import { SiGmail } from 'react-icons/si';

const socialIconStyles =
  'w-[45px] h-[45px] p-3 overflow:visible rounded-[100%] text-[#dddddd] fill-current transition-all duration-400 shadow-[inset_0_0_20px_rgba(255,255,255,0.3),inset_0_0_5px_rgba(255,255,255,0.5),0_5px_5px_rgba(0,0,0,0.164)] cursor-pointer px-[1px] hover:scale-93 hover:shadow-[inset_0_0_10px_rgba(127,34,254,0.6),inset_0_0_12px_rgba(255,255,255,0.5)]';

const SocialIcons = () => {
  return (
    <ul className='flex items-center justify-center gap-5 p-4 pl-0 list-none flex-nowrap flex-row'>
      <li title='LinkedIn'>
        <a
          href='https://www.linkedin.com/company/impactful-pitch/'
          aria-label='Impactful Pitch LinkedIn'
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaLinkedinIn className={socialIconStyles} />
        </a>
      </li>
      <li title='Instagram'>
        <a
          href='https://www.instagram.com/impactfulpitch/'
          aria-label='Impactful Pitch Instagram'
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaInstagram className={socialIconStyles} />
        </a>
      </li>
      <li title='X'>
        <a
          href='https://x.com/ImpactfulPitch'
          aria-label='Impactful Pitch X (Twitter)'
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaXTwitter className={socialIconStyles} />
        </a>
      </li>
      <li title='Facebook'>
        <a
          href='https://www.facebook.com/impactfulpitch/'
          aria-label='Impactful Pitch Facebook'
          target='_blank'
          rel='noopener noreferrer'
        >
          <FaFacebookF className={socialIconStyles} />
        </a>
      </li>
      <li title='Email'>
        <a
          href='mailto:info@impactfulpitch.com'
          aria-label='Impactful Pitch Email'
          target='_blank'
          rel='noopener noreferrer'
        >
          <SiGmail className={socialIconStyles} />
        </a>
      </li>
    </ul>
  );
};

// const StyledWrapper = styled.div`

//   .svg {
//     transition: all 0.3s;
//     padding: 0.75rem;
//     height: 45px;
//     overflow: visible;
//     width: 45px;
//     border-radius: 100%;
//     color: #dddddd;
//     fill: currentColor;
//     box-shadow:
//       inset 0 0 20px rgba(255, 255, 255, 0.3),
//       inset 0 0 5px rgba(255, 255, 255, 0.5),
//       0 5px 5px rgba(0, 0, 0, 0.164);
//   }
// `;

export default SocialIcons;
