/**
 * Get the event-store meta data for the given version.
 *
 * @param name    - Which module is being pulled.
 * @param version - Version to get meta from.
 */
export async function getModuleMeta(name: string, version: string) {
  const res = await fetch(`https://jsr.io/@valkyr/${name}/${version}_meta.json`);
  if (res.status !== 200) {
    throw new Error(`Failed to retrieve @valkyr/${name} meta from jsr.io`);
  }
  return res.json();
}
