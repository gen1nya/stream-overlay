import styled from 'styled-components';
import { tokens } from '../tokens';
import Button from './Button';
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from './Card';
import { Section, SectionHeader, SectionTitle } from './Section';
import Input from './Input';
import Select from './Select';
import Badge from './Badge';
import { Divider } from './Divider';
import { ScrollArea } from './ScrollArea';

const Page = styled.main`
    box-sizing: border-box;
    min-height: 100vh;
    width: 100%;
    overflow: auto;
    padding: ${tokens.space.xxxl};
    background: ${tokens.color.bg.base};
    color: ${tokens.color.text.primary};
    font-family: ${tokens.font.family.base};
`;

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.xxxl};
    max-width: 1180px;
    margin: 0 auto;
`;

const Group = styled.section`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.lg};
`;

const GroupTitle = styled.h2`
    margin: 0;
    font-size: ${tokens.font.size.xxl};
    font-weight: ${tokens.font.weight.semibold};
    line-height: ${tokens.font.lineHeight.tight};
    color: ${tokens.color.text.primary};
`;

const SubTitle = styled.h3`
    margin: ${tokens.space.sm} 0 0;
    font-size: ${tokens.font.size.lg};
    font-weight: ${tokens.font.weight.semibold};
    line-height: ${tokens.font.lineHeight.tight};
    color: ${tokens.color.text.secondary};
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: ${tokens.space.md};
`;

const Swatch = styled.div`
    min-height: 88px;
    padding: ${tokens.space.md};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${({ $value }) => $value};
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: ${tokens.space.xs};
    box-shadow: ${tokens.shadow.sm};
`;

const Label = styled.span`
    color: ${tokens.color.text.primary};
    font-size: ${tokens.font.size.sm};
    font-weight: ${tokens.font.weight.semibold};
    line-height: ${tokens.font.lineHeight.base};
`;

const Muted = styled.span`
    color: ${tokens.color.text.muted};
    font-size: ${tokens.font.size.xs};
    line-height: ${tokens.font.lineHeight.base};
`;

const DemoRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${tokens.space.md};
`;

const DemoColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.sm};
    min-width: 220px;
`;

const RulerRow = styled.div`
    display: grid;
    grid-template-columns: 80px 1fr;
    align-items: center;
    gap: ${tokens.space.md};
`;

const Ruler = styled.div`
    width: ${({ $value }) => $value};
    height: ${tokens.space.lg};
    border-radius: ${tokens.radius.sm};
    background: ${tokens.gradient.accent};
`;

const RadiusSample = styled.div`
    width: 96px;
    height: 48px;
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${({ $value }) => $value};
    background: ${tokens.color.bg.raised};
`;

const ShadowSample = styled.div`
    min-height: 80px;
    padding: ${tokens.space.lg};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.bg.raised};
    box-shadow: ${({ $value }) => $value};
`;

const TypeSample = styled.div`
    padding: ${tokens.space.md};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.bg.surface};
    font-size: ${({ $value }) => $value};
`;

const Icon = styled.svg`
    width: ${tokens.space.lg};
    height: ${tokens.space.lg};
`;

const FullWidthDemo = styled.div`
    width: min(420px, 100%);
`;

const buttonVariants = ['primary', 'secondary', 'danger', 'ghost', 'neutral'];
const buttonSizes = ['md', 'sm'];

const Surface = styled.div`
    padding: ${tokens.space.lg};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.xl};
    background: ${tokens.color.bg.surface};
`;

const FeatureCard = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};
    padding: ${tokens.space.md} ${tokens.space.lg};
    background: ${({ $f }) => $f.soft};
    border: 1px solid ${({ $f }) => $f.softBorder};
    border-radius: ${tokens.radius.lg};
`;

const FeatureDot = styled.span`
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    border-radius: ${tokens.radius.circle};
    background: ${({ $f }) => $f.base};
    box-shadow: 0 0 8px ${({ $f }) => $f.base};
`;

const FeatureText = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.xs};
    min-width: 0;
`;

const FeatureName = styled.span`
    color: ${({ $f }) => $f.base};
    font-size: ${tokens.font.size.sm};
    font-weight: ${tokens.font.weight.semibold};
`;

const featureList = [
    ['general · настройки/about', tokens.color.feature.general],
    ['chat · ядро', tokens.color.feature.chat],
    ['bot · автоматизация', tokens.color.feature.bot],
    ['media · медиа', tokens.color.feature.media],
    ['integrations · OBS/HTTP/DA', tokens.color.feature.integrations],
    ['players · аудио', tokens.color.feature.players],
    ['goals · цели', tokens.color.feature.goals],
    ['youtube · бренд', tokens.color.feature.youtube],
];

const cardSamples = [
    ['media', 'Media card', 'Feature header keeps the raised dark surface with a pink section accent.'],
    ['bot', 'Bot automation', 'Feature tint marks automation surfaces without changing the card API.'],
    ['integrations', 'Integrations', 'Blue feature treatment for OBS, HTTP, and external service panels.'],
];

const sampleIcon = (
    <Icon viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 3l2.4 5.8 6.1.5-4.6 4 1.4 5.9L12 16.1 6.7 19.2l1.4-5.9-4.6-4 6.1-.5L12 3z" />
    </Icon>
);

const tokenGroups = [
    ['surfaces', tokens.color.bg],
    ['borders', tokens.color.border],
    ['text', tokens.color.text],
    ['accent', tokens.color.accent],
    ['muted fills', tokens.color.fillMuted],
    ['semantic danger', tokens.color.danger],
    ['semantic warning', tokens.color.warning],
    ['semantic success', tokens.color.success],
    ['semantic info', tokens.color.info],
];

const Showcase = () => (
    <Page>
        <Layout>
            <Group>
                <GroupTitle>TOKENS</GroupTitle>
                {tokenGroups.map(([name, group]) => (
                    <Group key={name}>
                        <SubTitle>{name}</SubTitle>
                        <Grid>
                            {Object.entries(group).map(([key, value]) => (
                                <Swatch key={key} $value={value}>
                                    <Label>{key}</Label>
                                    <Muted>{value}</Muted>
                                </Swatch>
                            ))}
                        </Grid>
                    </Group>
                ))}

                <SubTitle>spacing</SubTitle>
                <Surface>
                    {Object.entries(tokens.space).map(([key, value]) => (
                        <RulerRow key={key}>
                            <Muted>{key}: {value}</Muted>
                            <Ruler $value={value} />
                        </RulerRow>
                    ))}
                </Surface>

                <SubTitle>radius</SubTitle>
                <DemoRow>
                    {Object.entries(tokens.radius).map(([key, value]) => (
                        <DemoColumn key={key}>
                            <RadiusSample $value={value} />
                            <Muted>{key}: {value}</Muted>
                        </DemoColumn>
                    ))}
                </DemoRow>

                <SubTitle>shadow</SubTitle>
                <Grid>
                    {Object.entries(tokens.shadow).map(([key, value]) => (
                        <ShadowSample key={key} $value={value}>
                            <Label>{key}</Label>
                        </ShadowSample>
                    ))}
                </Grid>

                <SubTitle>typography</SubTitle>
                <Grid>
                    {Object.entries(tokens.font.size).map(([key, value]) => (
                        <TypeSample key={key} $value={value}>
                            <Label>{key}</Label>
                            <Muted>{value}</Muted>
                        </TypeSample>
                    ))}
                </Grid>

                <SubTitle>feature accents · по группам + бренды</SubTitle>
                <Grid>
                    {featureList.map(([name, f]) => (
                        <FeatureCard key={name} $f={f}>
                            <FeatureDot $f={f} />
                            <FeatureText>
                                <FeatureName $f={f}>{name}</FeatureName>
                                <Muted>{f.base}</Muted>
                            </FeatureText>
                        </FeatureCard>
                    ))}
                </Grid>
            </Group>

            <Group>
                <GroupTitle>COMPONENTS</GroupTitle>

                <Surface>
                    <SubTitle>Button</SubTitle>
                    {buttonSizes.map((size) => (
                        <DemoColumn key={size}>
                            <Muted>{size}</Muted>
                            <DemoRow>
                                {buttonVariants.map((variant) => (
                                    <Button key={variant} $variant={variant} $size={size}>{sampleIcon}{variant}</Button>
                                ))}
                            </DemoRow>
                        </DemoColumn>
                    ))}
                    <DemoRow>
                        <Button $variant="primary" disabled>{sampleIcon}disabled</Button>
                    </DemoRow>
                    <FullWidthDemo>
                        <Button $variant="primary" $fullWidth>{sampleIcon}full width</Button>
                    </FullWidthDemo>
                </Surface>

                <SubTitle>Cards</SubTitle>
                <Card>
                    <CardHeader>
                        <CardTitle>{sampleIcon}Card title</CardTitle>
                        <CardSubtitle>Card subtitle</CardSubtitle>
                    </CardHeader>
                    <CardContent>
                        <Muted>Card content uses the refreshed raised surface, border, spacing, and hover depth.</Muted>
                    </CardContent>
                </Card>
                {cardSamples.map(([feature, title, description]) => (
                    <Card key={feature}>
                        <CardHeader $feature={feature}>
                            <CardTitle $feature={feature}>{sampleIcon}{title}</CardTitle>
                            <CardSubtitle>{feature}</CardSubtitle>
                        </CardHeader>
                        <CardContent>
                            <Muted>{description}</Muted>
                            <Badge $variant="info">{feature}</Badge>
                        </CardContent>
                    </Card>
                ))}

                <Surface>
                    <Section>
                        <SectionHeader>
                            <SectionTitle>{sampleIcon}Section title</SectionTitle>
                        </SectionHeader>
                        <Muted>Section content keeps the compact settings rhythm.</Muted>
                    </Section>
                </Surface>

                <Surface>
                    <SubTitle>Input</SubTitle>
                    <DemoRow>
                        <DemoColumn>
                            <Muted>normal</Muted>
                            <Input placeholder="Normal input" />
                        </DemoColumn>
                        <DemoColumn>
                            <Muted>hover note</Muted>
                            <Input placeholder="Hover changes border" />
                        </DemoColumn>
                        <DemoColumn>
                            <Muted>focus note</Muted>
                            <Input placeholder="Focus uses accent ring" />
                        </DemoColumn>
                        <DemoColumn>
                            <Muted>error</Muted>
                            <Input $error placeholder="Error input" />
                        </DemoColumn>
                        <DemoColumn>
                            <Muted>disabled</Muted>
                            <Input disabled placeholder="Disabled input" />
                        </DemoColumn>
                    </DemoRow>
                </Surface>

                <Surface>
                    <SubTitle>Select</SubTitle>
                    <DemoRow>
                        <DemoColumn>
                            <Muted>normal</Muted>
                            <Select defaultValue="one">
                                <option value="one">Normal select</option>
                                <option value="two">Second option</option>
                            </Select>
                        </DemoColumn>
                        <DemoColumn>
                            <Muted>error</Muted>
                            <Select $error defaultValue="one">
                                <option value="one">Error select</option>
                                <option value="two">Second option</option>
                            </Select>
                        </DemoColumn>
                    </DemoRow>
                </Surface>

                <Surface>
                    <SubTitle>Badge</SubTitle>
                    <DemoRow>
                        {['info', 'warning', 'success', 'danger'].map((variant) => (
                            <Badge key={variant} $variant={variant}>{variant}</Badge>
                        ))}
                    </DemoRow>
                </Surface>

                <Surface>
                    <SubTitle>Divider</SubTitle>
                    <Muted>above</Muted>
                    <Divider />
                    <Muted>below</Muted>
                </Surface>

                <Surface>
                    <SubTitle>ScrollArea</SubTitle>
                    <ScrollArea maxHeight="140px">
                        {Array.from({ length: 10 }, (_, index) => (
                            <p key={index}>
                                <Muted>Scrollable sample row {index + 1}</Muted>
                            </p>
                        ))}
                    </ScrollArea>
                </Surface>
            </Group>
        </Layout>
    </Page>
);

export default Showcase;
