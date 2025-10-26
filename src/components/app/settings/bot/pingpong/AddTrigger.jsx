import React, { useState, Fragment } from 'react';
import { Row } from '../../../SettingsComponent';
import { TitleRow } from '../../SettingBloks';
import RadioGroup from '../../../../utils/TextRadioGroup';
import {Button, FlagsInput, TextInput} from "./PingPongActionEditorComponent";


// -----------------------------------------------------------------------------
// Add‑new‑trigger component
// -----------------------------------------------------------------------------
export default function AddTrigger({
                                       commandIndex,
                                       apply,
                                       updateConfig
                                   }) {
    const [type, setType] = useState('text');
    const [text, setText] = useState('');
    const [regex, setRegex] = useState('');
    const [flags, setFlags] = useState('');
    const [errors, setErrors] = useState({ value: false, flags: false });

    const validate = () => {
        if (type === 'text') {
            if (!text.trim()) {
                setErrors({ value: true });
                return false;
            }
            return true;
        }
        // regex type
        try {
            if (!regex.trim()) throw new Error('empty');
            // eslint-disable-next-line no-new
            new RegExp(regex, flags);
            return true;
        } catch (e) {
            setErrors({ value: true, flags: false });
            return false;
        }
    };

    const handleAdd = () => {
        if (!validate()) return;

        apply((prev) =>
            updateConfig(prev, (cfg) => {
                const trigger =
                    type === 'text'
                        ? { type: 'text', value: text.trim() }
                        : { type: 'regex', value: regex, flags };
                const commands = cfg.pingpong.commands.map((cmd, i) =>
                    i === commandIndex
                        ? { ...cmd, triggers: [...cmd.triggers, trigger] }
                        : cmd,
                );
                return {
                    ...cfg,
                    pingpong: { ...cfg.pingpong, commands },
                };
            }),
        );

        // reset
        setText('');
        setRegex('');
        setFlags('');
        setErrors({ value: false, flags: false });
    };

    return (
        <div
            style={{
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 6,
                paddingBottom: 6,
                marginTop: 12,
                border: '1px solid #fff',
                borderRadius: 6,
                backgroundColor: 'rgba(136,83,242,0)',
            }}
        >
            <Row>
                <TitleRow>Добавить триггер:</TitleRow>
                <RadioGroup
                    defaultSelected={type}
                    items={[
                        { key: 'text', text: 'текст' },
                        { key: 'regex', text: 'regex' },
                    ]}
                    direction="horizontal"
                    itemWidth="100px"
                    onChange={(val) => {
                        setType(val);
                        setErrors({ value: false, flags: false });
                    }}
                />
            </Row>

            {type === 'text' && (
                <Row>
                    <TextInput
                        style={{marginTop: 8}}
                        $error={errors.value}
                        placeholder="Текст триггера"
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setErrors({ value: false });
                        }}
                    />
                    <Button
                        $mt={8} onClick={handleAdd}>
                        Добавить
                    </Button>
                </Row>
            )}

            {type === 'regex' && (
                <Fragment>
                    <Row>
                        <TextInput
                            style={{marginTop: 8}}
                            $error={errors.value}
                            placeholder="RegExp"
                            value={regex}
                            onChange={(e) => {
                                setRegex(e.target.value);
                                setErrors({ value: false, flags: false });
                            }}
                        />
                        <Button
                            $mt={8} onClick={handleAdd}>
                            Добавить
                        </Button>
                    </Row>
                    <Row>
                        <FlagsInput
                            style={{marginTop: 8}}
                            $error={errors.flags}
                            placeholder="Флаги"
                            value={flags}
                            onChange={(e) => {
                                setFlags(e.target.value);
                                setErrors({ ...errors, flags: false });
                            }}
                        />
                    </Row>
                </Fragment>
            )}
        </div>
    );
}