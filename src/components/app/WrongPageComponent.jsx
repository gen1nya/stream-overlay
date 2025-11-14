import { useTranslation } from 'react-i18next';

export default function () {
    const { t } = useTranslation();

    return (
        <div style={{ textAlign: 'center', margin: '0 auto' }}>
            <h2>{t('notFound.title')}</h2>
            <p>{t('notFound.hint')}</p>
        </div>
    );
}