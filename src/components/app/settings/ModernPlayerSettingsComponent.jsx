import React from 'react';
import styled from 'styled-components';
import SeekbarComponent from "../../utils/SeekbarComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import FontAndSizeEditor from "../../utils/FontAndSizeEditor";
import {
    CardContent,
    CardHeader,
    CardTitle,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
    ControlGroup
} from "./SharedSettingsStyles";
import {TbShadow} from "react-icons/tb";
import {FiMusic, FiType, FiImage, FiSettings} from "react-icons/fi";
import {BiExpand} from "react-icons/bi";
import RadioGroup from "../../utils/TextRadioGroup";
import ColorSelectorButton from "./ColorSelectorButton";
import {RiColorFilterLine} from "react-icons/ri";
import {Row} from "../SettingsComponent";
import {Spacer} from "../../utils/Separator";

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 8px;
`;

const DimensionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 8px;
`;

const DimensionsSection = styled.div`
    background: rgba(40, 40, 40, 0.3);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
`;

const DimensionsTitle = styled.h5`
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #ccc;
    text-align: center;
`;

const TextPropertyCard = styled.div`
    background: rgba(40, 40, 40, 0.3);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
`;

const TextPropertyTitle = styled.h5`
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #ccc;
    display: flex;
    align-items: center;
    gap: 8px;
`;

export default function ModernPlayerSettingsComponent({
                                                          current,
                                                          onChange,
                                                          openColorPopup
                                                      }) {

    const updatePlayer = (path, value) => {
        onChange(prev => {
            const newState = { ...prev };
            if (!newState.modernPlayer) newState.modernPlayer = {};
            const keys = path.split('.');
            let current = newState.modernPlayer;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const updateColor = (path, color, alpha = null) => {
        if (alpha !== null) {
            updatePlayer(`${path}Opacity`, alpha);
        }
        updatePlayer(`${path}`, color);
    };

    const modernPlayer = current.modernPlayer || {};

    return (
        <SettingsCard>
            <CardHeader>
                <CardTitle>
                    <FiMusic/>
                    Настройки современного плеера
                </CardTitle>
            </CardHeader>

            <CardContent>
                {/* Общие настройки */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiSettings />
                            Общие настройки
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="20px">
                        <ControlGroup>
                            <RadioGroup
                                title="Режим отображения"
                                defaultSelected={modernPlayer.mode ?? 'compact'}
                                items={[
                                    { key: 'compact', text: 'Компактный' },
                                    { key: 'expanded', text: 'Расширенный' }
                                ]}
                                direction="horizontal"
                                itemWidth="140px"
                                onChange={value => updatePlayer('mode', value)}
                            />
                        </ControlGroup>

                        <Spacer />

                        <ControlGroup>
                            <SeekbarComponent
                                title={`Скругление углов: ${modernPlayer.borderRadius ?? 16}px`}
                                min={0}
                                max={32}
                                value={modernPlayer.borderRadius ?? 16}
                                step={1}
                                width="200px"
                                onChange={value => updatePlayer('borderRadius', value)}
                            />
                        </ControlGroup>
                    </Row>
                </Section>

                {/* Размеры */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <BiExpand />
                            Размеры плеера
                        </SectionTitle>
                    </SectionHeader>

                    <DimensionsGrid>
                        <DimensionsSection>
                            <DimensionsTitle>Компактный режим</DimensionsTitle>
                            <ControlGroup>
                                <NumericEditorComponent
                                    title="Ширина"
                                    value={modernPlayer.widthCompact ?? 300}
                                    max={600}
                                    min={200}
                                    width="120px"
                                    onChange={value => updatePlayer('widthCompact', value)}
                                />
                            </ControlGroup>
                            <ControlGroup>
                                <NumericEditorComponent
                                    title="Высота"
                                    value={modernPlayer.heightCompact ?? 64}
                                    max={120}
                                    min={40}
                                    width="120px"
                                    onChange={value => updatePlayer('heightCompact', value)}
                                />
                            </ControlGroup>
                        </DimensionsSection>

                        <DimensionsSection>
                            <DimensionsTitle>Расширенный режим</DimensionsTitle>
                            <ControlGroup>
                                <NumericEditorComponent
                                    title="Ширина"
                                    value={modernPlayer.widthExpanded ?? 400}
                                    max={800}
                                    min={300}
                                    width="120px"
                                    onChange={value => updatePlayer('widthExpanded', value)}
                                />
                            </ControlGroup>
                            <ControlGroup>
                                <NumericEditorComponent
                                    title="Высота"
                                    value={modernPlayer.heightExpanded ?? 80}
                                    max={250}
                                    min={60}
                                    width="120px"
                                    onChange={value => updatePlayer('heightExpanded', value)}
                                />
                            </ControlGroup>
                        </DimensionsSection>
                    </DimensionsGrid>
                </Section>

                {/* Цветовая схема */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <RiColorFilterLine />
                            Цветовая схема
                        </SectionTitle>
                    </SectionHeader>

                    <ColorGrid>
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Основной фон"
                                alpha={modernPlayer.backgroundOpacity ?? 0.94}
                                hex={modernPlayer.backgroundColor ?? "#000000"}
                                onColorChange={({color, alpha}) => {
                                    updatePlayer('backgroundColor', color);
                                    updatePlayer('backgroundOpacity', alpha);
                                }}
                            />
                        </ControlGroup>

                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Оттенок фона"
                                alpha={modernPlayer.backgroundTintOpacity ?? 0.3}
                                hex={modernPlayer.backgroundTint ?? "#000000"}
                                onColorChange={({color, alpha}) => {
                                    updatePlayer('backgroundTint', color);
                                    updatePlayer('backgroundTintOpacity', alpha);
                                }}
                            />
                        </ControlGroup>

                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Обводка"
                                alpha={modernPlayer.borderOpacity ?? 1.0}
                                hex={modernPlayer.borderColor ?? "#333333"}
                                onColorChange={({color, alpha}) => {
                                    updatePlayer('borderColor', color);
                                    updatePlayer('borderOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                    </ColorGrid>
                </Section>

                {/* Тень */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <TbShadow />
                            Тень
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="20px">
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Цвет тени"
                                alpha={modernPlayer.shadowOpacity ?? 0.26}
                                hex={modernPlayer.shadowColor ?? "#000000"}
                                onColorChange={({color, alpha}) => {
                                    updatePlayer('shadowColor', color);
                                    updatePlayer('shadowOpacity', alpha);
                                }}
                            />
                        </ControlGroup>

                        <Spacer />

                        <ControlGroup>
                            <SeekbarComponent
                                title={`Радиус тени: ${modernPlayer.shadowRadius ?? 20}px`}
                                min={0}
                                max={50}
                                value={modernPlayer.shadowRadius ?? 20}
                                step={1}
                                width="200px"
                                onChange={value => updatePlayer('shadowRadius', value)}
                            />
                        </ControlGroup>
                    </Row>
                </Section>

                {/* Настройки изображения */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiImage />
                            Настройки изображения
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="20px">
                        <ControlGroup>
                            <RadioGroup
                                title="Позиция изображения"
                                defaultSelected={modernPlayer.image?.position ?? 'left'}
                                items={[
                                    { key: 'left', text: 'Слева' },
                                    { key: 'right', text: 'Справа' }
                                ]}
                                direction="horizontal"
                                itemWidth="120px"
                                onChange={value => updatePlayer('image.position', value)}
                            />
                        </ControlGroup>

                        <Spacer />

                        <ControlGroup>
                            <NumericEditorComponent
                                title="Размер изображения (компактный)"
                                value={modernPlayer.image?.compact?.size ?? 48}
                                max={120}
                                min={32}
                                width="120px"
                                onChange={value => updatePlayer('image.compact.size', value)}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <NumericEditorComponent
                                title="Размер изображения (расширенный)"
                                value={modernPlayer.image?.extended?.size ?? 48}
                                max={120}
                                min={32}
                                width="120px"
                                onChange={value => updatePlayer('image.extended.size', value)}
                            />
                        </ControlGroup>
                    </Row>
                </Section>

                {/* Настройки текста */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiType />
                            Настройки текста
                        </SectionTitle>
                    </SectionHeader>

                    <ControlGroup>
                        <Row>
                            <RadioGroup
                                title="Выравнивание текста"
                                defaultSelected={modernPlayer.text?.textAlign ?? 'left'}
                                items={[
                                    { key: 'left', text: 'Слева' },
                                    { key: 'center', text: 'По центру' },
                                    { key: 'right', text: 'Справа' },
                                ]}
                                direction="horizontal"
                                itemWidth="120px"
                                onChange={value => updatePlayer('text.textAlign', value)}
                            />
                        </Row>
                    </ControlGroup>

                    <ColorGrid>
                        <TextPropertyCard>
                            <TextPropertyTitle>
                                <FiMusic />
                                Название трека
                            </TextPropertyTitle>
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title="Цвет текста"
                                    alpha={1.0}
                                    hex={modernPlayer.text?.title?.color ?? "#ffffff"}
                                    onColorChange={({color}) => {
                                        updatePlayer('text.title.color', color);
                                    }}
                                />
                            </ControlGroup>
                            <ControlGroup>
                                <FontAndSizeEditor
                                    title="Шрифт и размер"
                                    fontSize={modernPlayer.text?.title?.fontSize ?? 16}
                                    fontFamily={modernPlayer.text?.title?.family ?? "Roboto"}
                                    onFontChange={({family, url}) => {
                                        updatePlayer('text.title.family', family);
                                        updatePlayer('text.title.url', url);
                                    }}
                                    onFontSizeChange={value => {
                                        updatePlayer('text.title.fontSize', value);
                                    }}
                                />
                            </ControlGroup>
                            <ControlGroup>
                                <RadioGroup
                                    title="Начертание"
                                    defaultSelected={modernPlayer.text?.title?.fontWeight ?? 'bold'}
                                    items={[
                                        { key: 'normal', text: 'Обычный' },
                                        { key: 'bold', text: 'Жирный' }
                                    ]}
                                    direction="horizontal"
                                    itemWidth="100px"
                                    onChange={value => updatePlayer('text.title.fontWeight', value)}
                                />
                            </ControlGroup>
                        </TextPropertyCard>

                        <TextPropertyCard>
                            <TextPropertyTitle>
                                <FiType />
                                Исполнитель
                            </TextPropertyTitle>
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title="Цвет текста"
                                    alpha={1.0}
                                    hex={modernPlayer.text?.artist?.color ?? "#858585"}
                                    onColorChange={({color}) => {
                                        updatePlayer('text.artist.color', color);
                                    }}
                                />
                            </ControlGroup>
                            <ControlGroup>
                                <FontAndSizeEditor
                                    title="Шрифт и размер"
                                    fontSize={modernPlayer.text?.artist?.fontSize ?? 14}
                                    fontFamily={modernPlayer.text?.artist?.family ?? "Roboto"}
                                    onFontChange={({family, url}) => {
                                        updatePlayer('text.artist.family', family);
                                        updatePlayer('text.artist.url', url);
                                    }}
                                    onFontSizeChange={value => {
                                        updatePlayer('text.artist.fontSize', value);
                                    }}
                                />
                            </ControlGroup>
                            <ControlGroup>
                                <RadioGroup
                                    title="Начертание"
                                    defaultSelected={modernPlayer.text?.artist?.fontWeight ?? 'normal'}
                                    items={[
                                        { key: 'normal', text: 'Обычный' },
                                        { key: 'bold', text: 'Жирный' }
                                    ]}
                                    direction="horizontal"
                                    itemWidth="100px"
                                    onChange={value => updatePlayer('text.artist.fontWeight', value)}
                                />
                            </ControlGroup>
                        </TextPropertyCard>
                    </ColorGrid>
                </Section>
            </CardContent>
        </SettingsCard>
    );
}