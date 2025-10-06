import React, {Fragment, useState} from "react";
import {Row} from "../../../SettingsComponent";
import {Button, TextInput} from "./PingPongActionEditorComponent";

// -----------------------------------------------------------------------------
// Add‑new‑response component
// -----------------------------------------------------------------------------
export default function AddResponse({
                         commandIndex,
                         apply,
                         updateConfig,
}) {
    const [value, setValue] = useState('');
    const [error, setError] = useState(false);

    const handleAdd = () => {
        const trimmed = value.trim();
        if (!trimmed) {
            setError(true);
            return;
        }

        apply((prev) =>
            updateConfig(prev, (cfg) => {
                console.log(cfg);
                const commands = cfg.pingpong.commands.map((cmd, i) =>
                    i === commandIndex
                        ? { ...cmd, responses: [...cmd.responses, trimmed] }
                        : cmd,
                );
                return {
                    ...cfg,
                    pingpong: { ...cfg.pingpong, commands },
                };
            }),
        );

        setValue('');
        setError(false);
    };

    return (
        <Fragment>
            <Row
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
                <TextInput
                    style={{  }}
                    $error={error}
                    placeholder="Новый ответ"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setError(false);
                    }}
                />
                <Button
                    style={{
                        background: 'rgba(136, 83, 242, 0.29)',
                        border: 'rgba(136, 83, 242, 0.64) 2px solid'
                    }}
                    $ml={8} onClick={handleAdd}>
                    Добавить
                </Button>
            </Row>
        </Fragment>
    );
}

