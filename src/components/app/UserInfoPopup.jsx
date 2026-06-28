import {useEffect, useMemo, useState} from "react";
import {getUserById, getUserByLogin, muteUser, unbanUser, updateRoles} from "../../services/api";
import Popup from "../utils/PopupComponent";
import styled from "styled-components";
import { tokens } from "../../designSystem/tokens";
import { Button, ModalHeader, ModalTitle, ModalBody, ModalClose } from "../../designSystem";
import {TbDiamond, TbDiamondOff, TbShield, TbShieldPlus, TbShieldX, TbClock, TbCalendar, TbUserCheck} from "react-icons/tb";
import { useTranslation } from 'react-i18next';

const UserSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.xl};
    padding: 20px;
`;

const UserHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const Avatar = styled.img`
    width: 72px;
    height: 72px;
    border-radius: ${tokens.radius.xl};
    border: 2px solid ${tokens.color.border.default};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const UserInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
`;

const UserName = styled.div`
    font-weight: 600;
    font-size: 1.3rem;
    color: ${tokens.color.text.primary};
    display: flex;
    align-items: center;
    gap: 8px;
`;

const RoleIcon = styled.span`
    display: flex;
    align-items: center;
    font-size: 1.2rem;
`;

const UserNameText = styled.span`
    text-decoration: ${({$muted}) => ($muted ? "line-through" : "none")};
    opacity: ${({$muted}) => ($muted ? 0.6 : 1)};
`;

const StatusBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: ${tokens.radius.md};
    font-size: 0.8rem;
    font-weight: 600;
    background: ${({ $type }) => {
        if ($type === 'muted') return 'rgba(220, 53, 69, 0.1)';
        if ($type === 'mod') return 'rgba(27, 167, 27, 0.1)';
        if ($type === 'vip') return 'rgba(224, 5, 185, 0.1)';
        return 'rgba(100, 108, 255, 0.1)';
    }};
    color: ${({ $type }) => {
        if ($type === 'muted') return '#dc3545';
        if ($type === 'mod') return '#1ba71b';
        if ($type === 'vip') return '#e005b9';
        return '#646cff';
    }};
    border: 1px solid ${({ $type }) => {
        if ($type === 'muted') return 'rgba(220, 53, 69, 0.3)';
        if ($type === 'mod') return 'rgba(27, 167, 27, 0.3)';
        if ($type === 'vip') return 'rgba(224, 5, 185, 0.3)';
        return 'rgba(100, 108, 255, 0.3)';
    }};

    svg {
        width: 12px;
        height: 12px;
    }
`;

const MetaInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid ${tokens.color.border.subtle};
`;

const MetaItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: ${tokens.color.text.muted};

    svg {
        width: 14px;
        height: 14px;
        color: ${tokens.color.accent.primary};
    }

    strong {
        color: #d6d6d6;
        font-weight: 500;
    }
`;

const ActionButtons = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

// Делегирует на примитив Button; className-API (primary/success/danger) маппится
// в $variant, flex-раскладка кнопочной сетки сохранена.
const ActionButton = styled(Button).attrs(({ className }) => ({
    $variant:
        className === 'success' ? 'secondary'
        : className === 'danger' ? 'danger'
        : className === 'primary' ? 'primary'
        : 'neutral',
}))`
    flex: 1;
    min-width: 120px;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    color: ${tokens.color.text.muted};
    font-size: 1rem;
`;

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    color: ${tokens.color.danger.text};
    text-align: center;
    
    p {
        margin: 0;
        font-size: 1rem;
    }
`;

const ModIcon = styled(TbShield)`
    color: #1ba71b;
`;

const GiveModIcon = styled(TbShieldPlus)`
    color: #1ba71b;
`;

const UnModIcon = styled(TbShieldX)`
    color: #1ba71b;
`;

const UnVIPIcon = styled(TbDiamondOff)`
    color: #e005b9;
`;

const VIPIcon = styled(TbDiamond)`
    color: #e005b9;
`;

export default function UserInfoPopup({userId, userName, onClose}) {
    const [uiModel, setUiModel] = useState({type: "loading", user: undefined});

    const [isMod, setIsMod] = useState(false);
    const [isVIP, setIsVIP] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [muteUntil, setMuteUntil] = useState(null);
    const { t, i18n } = useTranslation();
    const dateLocale = useMemo(() => (i18n.language === 'ru' ? 'ru-RU' : 'en-US'), [i18n.language]);

    const handleMute = (duration) => {
        const id = uiModel.user?.user?.id;
        if (!id) {
            console.error("User ID is not available for mute operation.");
            return;
        }
        if (isMuted) {
            unbanUser(id)
                .then(r => {
                    console.log("User unmuted successfully:", r);
                    setIsMuted(false);
                    setMuteUntil(null);
                })
                .catch(error => {
                    setIsMuted(true);
                    console.error("Error unmuting user:", error);
                });
        } else {
            muteUser(id, "Muted by moderator", duration)
                .then(r => {
                    console.log("User muted successfully:", r);
                    setIsMuted(true);
                    setMuteUntil(new Date(Date.now() + duration * 1000));
                    setIsMod(false);
                })
                .catch(error => {
                    setIsMuted(false);
                    setMuteUntil(null);
                    console.error("Error muting user:", error);
                });
        }
    }

    const handleRoleToggle = (role) => {
        let update = {};
        if (role === "mod") {
            update = {isMod: !isMod}
        } else if (role === "vip") {
            update = {isVip: !isVIP}
        }
        updateRoles(
            uiModel.user.user.id,
            {
                current: {
                    isMod: isMod,
                    isVip: isVIP
                },
                update: update
            }
        ).then(r => {
            setIsMod(r.isMod);
            setIsVIP(r.isVip);
        }).catch(error => {
            console.error("Error updating user roles:", error);
        })
    }

    useEffect(() => {
        if (userId) {
            getUserById(userId)
                .then((user) => {
                    setUiModel({type: "loaded", user});
                })
                .catch((error) => {
                    console.error("Error fetching user info:", error);
                    setUiModel({type: "error"});
                });
        } else if (userName) {
            getUserByLogin(userName)
                .then((user) => {
                    setUiModel({type: "loaded", user});
                })
                .catch((error) => {
                    console.error("Error fetching user info:", error);
                    setUiModel({type: "error"});
                });
        } else {
            setUiModel({type: "error"});
        }
    }, [userId, userName]);

    useEffect(() => {
        if (uiModel.type === "loaded" && uiModel.user) {
            setIsMod(uiModel.user.isModerator);
            setIsVIP(uiModel.user.isVIP);
            setIsMuted(uiModel.user.isBanned || false);
            setMuteUntil(uiModel.user.banExpiresAt ?? null);
        }
    }, [uiModel]);

    return (
        <Popup onClose={onClose} minWidth="420px" maxWidth="520px">
            <ModalHeader $feature="chat">
                <ModalTitle $feature="chat">{t('userInfo.title')}</ModalTitle>
                <ModalClose onClick={onClose} />
            </ModalHeader>
            <ModalBody>
                {uiModel.type === "loading" && (
                    <LoadingContainer>{t('userInfo.loading')}</LoadingContainer>
                )}

                {uiModel.type === "loaded" && uiModel.user && (
                    <>
                        <UserSection>
                            <UserHeader>
                                <Avatar src={uiModel.user.user.profile_image_url} alt="Avatar"/>
                                <UserInfo>
                                    <UserName>
                                        {isMod && (
                                            <RoleIcon>
                                                <ModIcon/>
                                            </RoleIcon>
                                        )}
                                        {isVIP && !isMod && (
                                            <RoleIcon>
                                                <VIPIcon/>
                                            </RoleIcon>
                                        )}
                                        <UserNameText $muted={isMuted}>
                                            {uiModel.user.user.display_name}
                                        </UserNameText>
                                    </UserName>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {isMod && (
                                            <StatusBadge $type="mod">
                                                <TbShield /> {t('userInfo.badges.moderator')}
                                            </StatusBadge>
                                        )}
                                        {isVIP && (
                                            <StatusBadge $type="vip">
                                                <TbDiamond /> {t('userInfo.badges.vip')}
                                            </StatusBadge>
                                        )}
                                        {isMuted && (
                                            <StatusBadge $type="muted">
                                                <TbClock /> {t('userInfo.badges.muted')}
                                            </StatusBadge>
                                        )}
                                    </div>
                                </UserInfo>
                            </UserHeader>

                            <MetaInfo>
                                <MetaItem>
                                    <TbUserCheck />
                                    <span>{t('userInfo.meta.id')}: <strong>{uiModel.user.user.id}</strong></span>
                                </MetaItem>
                                <MetaItem>
                                    <TbCalendar />
                                    <span>{t('userInfo.meta.created')}: <strong>{new Date(uiModel.user.user.created_at).toLocaleDateString(dateLocale)}</strong></span>
                                </MetaItem>
                                {uiModel.user.followedAt && (
                                    <MetaItem>
                                        <TbUserCheck />
                                        <span>{t('userInfo.meta.following')}: <strong>{new Date(uiModel.user.followedAt).toLocaleDateString(dateLocale)}</strong></span>
                                    </MetaItem>
                                )}
                                {isMuted && muteUntil && (
                                    <MetaItem>
                                        <TbClock />
                                        <span>{t('userInfo.meta.mutedUntil')}: <strong>{new Date(muteUntil).toLocaleTimeString(dateLocale)}</strong></span>
                                    </MetaItem>
                                )}
                            </MetaInfo>
                        </UserSection>

                        <ActionButtons>
                            {isMuted && (
                                <ActionButton className="success" onClick={() => handleMute()}>
                                    {t('userInfo.actions.unban')}
                                </ActionButton>
                            )}
                            {!isMuted && (
                                <>
                                    <ActionButton onClick={() => handleMute(60)}>
                                        {t('userInfo.actions.mute1m')}
                                    </ActionButton>
                                    <ActionButton onClick={() => handleMute(600)}>
                                        {t('userInfo.actions.mute10m')}
                                    </ActionButton>
                                </>
                            )}

                            <ActionButton onClick={() => handleRoleToggle("vip")}>
                                {isVIP ? <UnVIPIcon size={18}/> : <VIPIcon size={18}/>}
                                {isVIP ? t('userInfo.actions.removeVip') : t('userInfo.actions.makeVip')}
                            </ActionButton>

                            <ActionButton onClick={() => handleRoleToggle("mod")}>
                                {isMod ? <UnModIcon size={18}/> : <GiveModIcon size={18}/>}
                                {isMod ? t('userInfo.actions.removeMod') : t('userInfo.actions.makeMod')}
                            </ActionButton>
                        </ActionButtons>
                    </>
                )}

                {uiModel.type === "error" && (
                    <ErrorContainer>
                        <p>{t('userInfo.error')}</p>
                    </ErrorContainer>
                )}
            </ModalBody>
        </Popup>
    );
}