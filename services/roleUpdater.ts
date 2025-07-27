import {addModerator, addVip, removeModerator, removeVip} from "./authorizedHelixApi";

export async function updateRoles(
    userId: string,
    roles: {
        current: { isMod: boolean; isVip: boolean };
        update: { isMod?: boolean; isVip?: boolean }
    }
): Promise<{ isMod: boolean; isVip: boolean }> {
    let { current, update } = roles;

    let isMod = current.isMod;
    let isVip = current.isVip;

    // Обновление модератора
    if (update.isMod !== undefined) {
        const shouldBeMod = update.isMod;
        if (shouldBeMod && !isMod) {
            if (isVip) {
                await removeVip(userId);
                isVip = false;
            }
            await addModerator(userId);
            isMod = true;
        } else if (!shouldBeMod && isMod) {
            await removeModerator(userId);
            isMod = false;
        }
    }

    if (update.isVip !== undefined) {
        const shouldBeVip = update.isVip;
        if (shouldBeVip && !isVip) {
            if (isMod) {
                await removeModerator(userId);
                isMod = false;
            }
            await addVip(userId);
            isVip = true;
        } else if (!shouldBeVip && isVip) {
            await removeVip(userId);
            isVip = false;
        }
    }

    return { isMod, isVip };
}