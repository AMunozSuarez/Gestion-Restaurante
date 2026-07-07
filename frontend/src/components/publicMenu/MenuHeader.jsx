import React from 'react';
import { PhoneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2c-2.72 0-3.06.01-4.12.06-1.06.05-1.79.22-2.43.47a4.9 4.9 0 0 0-1.77 1.15A4.9 4.9 0 0 0 2.53 5.45c-.25.64-.42 1.37-.47 2.43C2.01 8.94 2 9.28 2 12s.01 3.06.06 4.12c.05 1.06.22 1.79.47 2.43a4.9 4.9 0 0 0 1.15 1.77 4.9 4.9 0 0 0 1.77 1.15c.64.25 1.37.42 2.43.47C8.94 21.99 9.28 22 12 22s3.06-.01 4.12-.06c1.06-.05 1.79-.22 2.43-.47a4.9 4.9 0 0 0 1.77-1.15 4.9 4.9 0 0 0 1.15-1.77c.25-.64.42-1.37.47-2.43.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12c-.05-1.06-.22-1.79-.47-2.43a4.9 4.9 0 0 0-1.15-1.77 4.9 4.9 0 0 0-1.77-1.15c-.64-.25-1.37-.42-2.43-.47C15.06 2.01 14.72 2 12 2Zm0 1.8c2.67 0 2.99.01 4.04.06.98.04 1.5.21 1.86.35.47.18.8.4 1.15.75.35.35.57.68.75 1.15.14.36.31.88.35 1.86.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.98-.21 1.5-.35 1.86-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.36.14-.88.31-1.86.35-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.98-.04-1.5-.21-1.86-.35a3.1 3.1 0 0 1-1.15-.75 3.1 3.1 0 0 1-.75-1.15c-.14-.36-.31-.88-.35-1.86-.05-1.05-.06-1.37-.06-4.04s.01-2.99.06-4.04c.04-.98.21-1.5.35-1.86.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.36-.14.88-.31 1.86-.35 1.05-.05 1.37-.06 4.04-.06Z" />
    <path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.75a3.05 3.05 0 1 1 0-6.1 3.05 3.05 0 0 1 0 6.1Z" />
    <circle cx="17.05" cy="6.95" r="1.1" />
  </svg>
);

const digitsOnly = (value) => (value || '').replace(/\D/g, '');

const MenuHeader = ({ name, description, logoUrl, bannerUrl, showLogo, phone, whatsapp, socialLinks }) => {
  const resolvedBanner = resolveMediaUrl(bannerUrl);
  const resolvedLogo = resolveMediaUrl(logoUrl);
  const whatsappDigits = digitsOnly(whatsapp);
  const instagram = socialLinks?.instagram;

  const hasContactInfo = Boolean(phone || whatsappDigits || instagram);

  return (
    <div className="relative">
      <div
        className="h-40 sm:h-56 w-full bg-[var(--menu-primary)] bg-cover bg-center"
        style={resolvedBanner ? { backgroundImage: `url(${resolvedBanner})` } : undefined}
      />
      <div className="px-4 sm:px-8">
        <div className={`flex flex-col items-center text-center ${showLogo && resolvedLogo ? '-mt-12 sm:-mt-16' : 'pt-4'}`}>
          {showLogo && resolvedLogo && (
            <img
              src={resolvedLogo}
              alt={name}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-lg bg-white"
            />
          )}
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-[var(--menu-text)]">{name}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm sm:text-base text-[var(--menu-text)] opacity-80">
              {description}
            </p>
          )}

          {hasContactInfo && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {phone && (
                <a
                  href={`tel:${digitsOnly(phone)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--menu-button)] text-white text-sm font-medium shadow-sm"
                >
                  <PhoneIcon className="w-4 h-4" />
                  {phone}
                </a>
              )}
              {whatsappDigits && (
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600 text-white text-sm font-medium shadow-sm"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
              {instagram && (
                <a
                  href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-600 text-white text-sm font-medium shadow-sm"
                >
                  <InstagramIcon className="w-4 h-4" />
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuHeader;
