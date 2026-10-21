import { redirect } from 'react-router'
import { queryPermission } from '@/features/location/geolocation'
import { loadSavedLocation } from '@/features/location/storage'

/**
 * A returning user: the browser confirms location is allowed AND a position is saved.
 * Without the Permissions API the answer is "unknown", so such users always see the landing page.
 */
async function hasGrantedLocation(): Promise<boolean> {
  return (await queryPermission()) === 'granted' && loadSavedLocation() !== undefined
}

/** `/`: returning users go straight to `/home` (FR-012). Others see the landing page. */
export async function landingLoader() {
  return (await hasGrantedLocation()) ? redirect('/home') : null
}

/** `/home`: anyone without granted permission and a saved position goes to the landing page (FR-014). */
export async function homeLoader() {
  return (await hasGrantedLocation()) ? null : redirect('/')
}
