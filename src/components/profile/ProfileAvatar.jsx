import { UserRound } from 'lucide-react';

const AVATAR_ICONS = {
  male_teacher: '👨‍🏫',
  female_teacher: '👩‍🏫',
  male_student: '👨‍🎓',
  female_student: '👩‍🎓',
};

export default function ProfileAvatar({ user, fallback = '?', className = '' }) {
  const showPhoto = user?.profile_image_mode === 'photo' && user?.profile_photo_url;
  const avatar = user?.profile_avatar || (user?.profile_gender === 'female' ? 'female_teacher' : 'male_teacher');

  return (
    <div className={`bg-primary/15 rounded-lg flex items-center justify-center text-sidebar-primary font-bold overflow-hidden ${className}`} dir="rtl">
      {showPhoto ? (
        <img
          src={user.profile_photo_url}
          alt="תמונת פרופיל"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 22%' }}
        />
      ) : AVATAR_ICONS[avatar] ? (
        <span className="text-xl leading-none" aria-hidden="true">{AVATAR_ICONS[avatar]}</span>
      ) : fallback ? (
        <span>{fallback}</span>
      ) : (
        <UserRound className="w-5 h-5" />
      )}
    </div>
  );
}