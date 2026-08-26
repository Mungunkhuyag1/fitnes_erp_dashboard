import { redirect } from 'next/navigation';

/**
 * `/settings` нь өөрөө агуулгагүй — эхний хэсэг рүү шилжүүлнэ.
 *
 * Профайл руу: бүх ажилтанд нээлттэй цорын ганц хэсэг тул ресепшн
 * ажилтан «эрх хүрэхгүй» гэсэн хуудсанд унахгүй.
 */
export default function SettingsIndex() {
  redirect('/settings/profile');
}
