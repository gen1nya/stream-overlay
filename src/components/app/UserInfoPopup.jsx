import {useEffect, useState} from "react";
import {getUserById, getUserByLogin, muteUser, unbanUser, updateRoles} from "../../services/api";
import Popup from "../utils/PopupComponent";
import styled from "styled-components";
import {TbDiamond, TbDiamondOff, TbShield, TbShieldPlus, TbShieldX, TbClock, TbCalendar, TbUserCheck} from "react-icons/tb";

const PopupContent = styled.div`
    display: flex;
    flex-direction: column;
    padding: 24px;
    min-width: 420px;
    gap: 16px;
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border-radius: 12px;
    box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid #444;
`;

const Title = styled.h2`
    font-size: 1.6rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
    background: linear-gradient(135deg, #646cff, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const UserSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
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
    border-radius: 12px;
    border: 2px solid #444;
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
    color: #fff;
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
    border-radius: 6px;
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
    border-top: 1px solid #333;
`;

const MetaItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #999;

    svg {
        width: 14px;
        height: 14px;
        color: #646cff;
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

const ActionButton = styled.button`
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    flex: 1;
    min-width: 120px;

    &:hover {
        background: #333;
        border-color: #555;
        transform: translateY(-1px);
    }

    &.primary {
        background: #646cff;
        border-color: #646cff;

        &:hover {
            background: #5a5acf;
            border-color: #5a5acf;
        }
    }

    &.success {
        background: #059669;
        border-color: #059669;

        &:hover {
            background: #047857;
            border-color: #047857;
        }
    }

    &.danger {
        background: #dc2626;
        border-color: #dc2626;

        &:hover {
            background: #b91c1c;
            border-color: #b91c1c;
        }
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    color: #999;
    font-size: 1rem;
`;

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    color: #dc3545;
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
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <Title>User Info</Title>
                </Header>

                {uiModel.type === "loading" && (
                    <LoadingContainer>Loading...</LoadingContainer>
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
                                                <TbShield /> Moderator
                                            </StatusBadge>
                                        )}
                                        {isVIP && (
                                            <StatusBadge $type="vip">
                                                <TbDiamond /> VIP
                                            </StatusBadge>
                                        )}
                                        {isMuted && (
                                            <StatusBadge $type="muted">
                                                <TbClock /> Muted
                                            </StatusBadge>
                                        )}
                                    </div>
                                </UserInfo>
                            </UserHeader>

                            <MetaInfo>
                                <MetaItem>
                                    <TbUserCheck />
                                    <span>ID: <strong>{uiModel.user.user.id}</strong></span>
                                </MetaItem>
                                <MetaItem>
                                    <TbCalendar />
                                    <span>Created: <strong>{new Date(uiModel.user.user.created_at).toLocaleDateString('ru-RU')}</strong></span>
                                </MetaItem>
                                {uiModel.user.followedAt && (
                                    <MetaItem>
                                        <TbUserCheck />
                                        <span>Follows since: <strong>{new Date(uiModel.user.followedAt).toLocaleDateString('ru-RU')}</strong></span>
                                    </MetaItem>
                                )}
                                {isMuted && muteUntil && (
                                    <MetaItem>
                                        <TbClock />
                                        <span>Muted until: <strong>{new Date(muteUntil).toLocaleTimeString('ru-RU')}</strong></span>
                                    </MetaItem>
                                )}
                            </MetaInfo>
                        </UserSection>

                        <ActionButtons>
                            {isMuted && (
                                <ActionButton className="success" onClick={() => handleMute()}>
                                    Unban
                                </ActionButton>
                            )}
                            {!isMuted && (
                                <>
                                    <ActionButton onClick={() => handleMute(60)}>
                                        Mute 1m
                                    </ActionButton>
                                    <ActionButton onClick={() => handleMute(600)}>
                                        Mute 10m
                                    </ActionButton>
                                </>
                            )}

                            <ActionButton onClick={() => handleRoleToggle("vip")}>
                                {isVIP ? <UnVIPIcon size={18}/> : <VIPIcon size={18}/>}
                                {isVIP ? 'Remove VIP' : 'Make VIP'}
                            </ActionButton>

                            <ActionButton onClick={() => handleRoleToggle("mod")}>
                                {isMod ? <UnModIcon size={18}/> : <GiveModIcon size={18}/>}
                                {isMod ? 'Remove Mod' : 'Make Mod'}
                            </ActionButton>
                        </ActionButtons>
                    </>
                )}

                {uiModel.type === "error" && (
                    <ErrorContainer>
                        <p>Could not load user info.</p>
                    </ErrorContainer>
                )}
            </PopupContent>
        </Popup>
    );
}