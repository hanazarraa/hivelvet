/**
 * Hivelvet open source platform - https://riadvice.tn/
 *
 * Copyright (c) 2022 RIADVICE SUARL and by respective authors (see below).
 *
 * This program is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License as published by the Free Software
 * Foundation; either version 3.0 of the License, or (at your option) any later
 * version.
 *
 * Hivelvet is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
 * PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License along
 * with Hivelvet; if not, see <http://www.gnu.org/licenses/>.
 */

import React, { useEffect, useState } from 'react';

import { Trans, withTranslation } from 'react-i18next';
import { t } from 'i18next';
import EN_US from '../locale/en-US.json';

import { PageHeader, Button, Typography, Table, Space, Popconfirm, Input, Tooltip, Modal, Avatar, Tag } from 'antd';
import {
    DeleteOutlined,
    SearchOutlined,
    QuestionCircleOutlined,
    UserOutlined,
    EditOutlined,
    ShareAltOutlined,
    CheckOutlined,
    CopyOutlined,
    FacebookOutlined,
    TwitterOutlined,
    LinkedinOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    InfoCircleOutlined,
    MinusCircleOutlined,
} from '@ant-design/icons';

import Highlighter from 'react-highlight-words/dist/main';
import Form, { FormInstance } from 'antd/lib/form';
import DynamicIcon from './DynamicIcon';

import { CopyToClipboard } from 'react-copy-to-clipboard';

import LocaleService from '../services/locale.service';
import AuthService from '../services/auth.service';

import { TableColumnType } from '../types/TableColumnType';
import { PaginationType } from '../types/PaginationType';
import RecordingsService from '../services/recordings.service';
import { RecordingType } from '../types/RecordingType';
import Notifications from './Notifications';
import { CompareRecords } from '../functions/compare.function';

const { Link } = Typography;

interface EditableCellProps {
    editing: boolean;
    children: React.ReactNode;
    dataIndex: keyof RecordingType;
    record: RecordingType;
}
const EditableContext = React.createContext<FormInstance | null>(null);

const Recordings = () => {
    const [data, setData] = React.useState<RecordingType[]>([]);
    const [recordingStates, setRecordingStates] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [actions, setActions] = React.useState<string[]>([]);
    const [pagination, setPagination] = React.useState<PaginationType>({ current: 1, pageSize: 5 });

    const [editingKey, setEditingKey] = React.useState<string>(null);
    const [errorsEdit, setErrorsEdit] = React.useState({});
    const [cancelVisibility, setCancelVisibility] = React.useState<boolean>(false);

    const [isModalVisible, setIsModalVisible] = React.useState<boolean>(false);
    const [modalFormats, setModalFormats] = React.useState<string[]>(null);
    const [modalUrl, setModalUrl] = React.useState<string>(null);
    const [copied, setCopied] = useState<boolean>(false);

    const [searchText, setSearchText] = React.useState<string>('');
    const [searchedColumn, setSearchedColumn] = React.useState<string>('');

    //list
    const getRecordings = () => {
        setLoading(true);
        RecordingsService.collect_recordings()
            .then((response) => {
                if (response.data.recordings) {
                    setData(response.data.recordings);
                }
                if (response.data.states) {
                    setRecordingStates(response.data.states);
                }
            })
            .catch((error) => {
                console.log(error);
            })
            .finally(() => {
                setLoading(false);
            });
    };
    useEffect(() => {
        //Runs only on the first render
        getRecordings();

        const recordingsActions = AuthService.getActionsPermissionsByGroup('recordings');
        recordingsActions.push('share');
        setActions(recordingsActions);
    }, []);

    // edit
    const [editForm] = Form.useForm();
    const EditableRow: React.FC = ({ ...props }) => {
        return (
            <Form size="middle" form={editForm} component={false} validateTrigger="onSubmit">
                <EditableContext.Provider value={editForm}>
                    <tr {...props} />
                </EditableContext.Provider>
            </Form>
        );
    };
    const EditableCell: React.FC<EditableCellProps> = ({ editing, children, dataIndex, record, ...restProps }) => {
        const inputNode: JSX.Element = <Input />;

        return (
            <td {...restProps}>
                {editing ? (
                    <Form.Item
                        name={dataIndex}
                        className="input-editable editable-row"
                        {...(dataIndex in errorsEdit &&
                            record.key == errorsEdit['key'] && {
                                help: (
                                    <Trans
                                        i18nKey={Object.keys(EN_US).filter(
                                            (elem) => EN_US[elem] == errorsEdit[dataIndex]
                                        )}
                                    />
                                ),
                                validateStatus: 'error',
                            })}
                        rules={[
                            {
                                required: true,
                                message: t('required_' + dataIndex),
                            },
                        ]}
                    >
                        {inputNode}
                    </Form.Item>
                ) : (
                    children
                )}
            </td>
        );
    };
    const toggleEdit = (record: RecordingType) => {
        setCancelVisibility(false);
        setEditingKey(record.key);
        editForm.setFieldsValue(record);
    };
    const isEditing = (record: RecordingType) => record.key == editingKey;
    const cancelEdit = () => {
        setEditingKey(null);
    };
    const saveEdit = async (record: RecordingType) => {
        try {
            const formValues: object = await editForm.validateFields();
            setErrorsEdit({});
            if (!CompareRecords(record, editForm.getFieldsValue(true))) {
                RecordingsService.edit_recording(formValues, record.key)
                    .then((response) => {
                        console.log(response.data);
                        const newRowData: RecordingType = response.data.recording;
                        const newData = [...data];
                        const index = newData.findIndex((item) => record.key === item.key);
                        if (index > -1 && newRowData != undefined) {
                            const item = newData[index];
                            newData.splice(index, 1, {
                                ...item,
                                ...newRowData,
                            });
                            setData(newData);
                            Notifications.openNotificationWithIcon('success', t('edit_recording_success'));
                            cancelEdit();
                        }
                    })
                    .catch((error) => {
                        console.log(error);
                    });
            } else {
                Notifications.openNotificationWithIcon('info', t('no_changes'));
                cancelEdit();
            }
        } catch (error) {
            console.log(error);
        }
    };

    // delete
    const handleDelete = (key: string) => {
        setLoading(true);
        RecordingsService.delete_recording(key)
            .then(() => {
                const newData = [...data];
                // delete table item
                setData(newData.filter((item) => item.key !== key));
                Notifications.openNotificationWithIcon('success', t('delete_recording_success'));
            })
            .catch((error) => {
                console.log(error);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // share
    const showModal = (formats: string[], url: string) => {
        setIsModalVisible(true);
        setModalFormats(formats);
        setModalUrl(url);
    };
    const copyClipboard = () => {
        setCopied(true);
        setTimeout(
            function () {
                setCopied(false);
            }.bind(this),
            5000
        );
    };
    const cancelShare = () => {
        setIsModalVisible(false);
    };
    const handleShare = () => {
        console.log(modalUrl);
    };

    // search
    const handleReset = (clearFilters) => {
        clearFilters();
        setSearchText('');
    };
    const handleSearch = (selectedKeys: string[], confirm, dataIndex: string, closed = false) => {
        if (closed) confirm({ closeDropdown: false });
        else confirm();
        setSearchText(selectedKeys[0]);
        setSearchedColumn(dataIndex);
    };
    const getColumnSearchProps = (dataIndex: string) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div className="table-search-bloc">
                <Input
                    size="middle"
                    className="table-search-input"
                    placeholder={t('search') + ' ' + t(dataIndex + '_col')}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys([e.target.value])}
                    onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
                />
                <Space className="table-search-btn">
                    <Button
                        type="primary"
                        size="small"
                        icon={<SearchOutlined />}
                        onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
                    >
                        {' '}
                        <Trans i18nKey="search" />
                    </Button>
                    <Button size="small" onClick={() => handleReset(clearFilters)}>
                        <Trans i18nKey="reset" />
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => handleSearch(selectedKeys, confirm, dataIndex, true)}
                    >
                        <Trans i18nKey="filter" />
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => <SearchOutlined className={filtered && 'search-icon-filtered'} />,
        onFilter: (value, record: RecordingType) => {
            const deleteWhiteSpaces = (text: string): string => {
                if (text.indexOf(' ') != -1) {
                    if (text[0] == ' ') {
                        text = text.slice(1);
                    }
                    if (text[text.length - 1]) {
                        text = text.slice(0, -1);
                    }
                }
                return text;
            };
            value = deleteWhiteSpaces(value);
            return record[dataIndex] ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()) : '';
        },
        render: (text) => {
            const renderColumn = () => {
                if (searchedColumn === dataIndex) {
                    return <Highlighter searchWords={[searchText]} autoEscape textToHighlight={text.toString()} />;
                }
                return text;
            };
            return renderColumn();
        },
    });

    const getFormatIcons = (formats: string[], showDisabled?: boolean) => {
        const getFormatIcon = (format: string, icon: string, className?: string) => {
            const enabled = formats.includes(format);
            if (enabled || showDisabled) {
                return (
                    <div className={className + !enabled && 'disabled'}>
                        <DynamicIcon type={icon} className={!enabled && 'icon-disabled'} />
                    </div>
                );
            }
        };

        //f_presentation, f_podcast, f_screenshare, f_notes, f_report_pdf

        return (
            <Space size="middle" className="recording-formats">
                {getFormatIcon('presentation', 'playback-presentation')}
                {getFormatIcon('podcast', 'playback-podcast')}
                {getFormatIcon('screenshare', 'DesktopOutlined', 'icon-desktop')}
                {getFormatIcon('mp4', 'mp4')}
                {getFormatIcon('reports', 'activity-reports')}
            </Space>
        );
    };

    const columns: TableColumnType[] = [
        {
            title: t('name_col'),
            dataIndex: 'name',
            editable: true,
            //width: '35%',
            ...getColumnSearchProps('name'),
            sorter: {
                compare: (a, b) => a.name.localeCompare(b.name),
                multiple: 2,
            },
        },
        {
            title: t('date_col'),
            dataIndex: 'date',
            editable: false,
            ...getColumnSearchProps('date'),
            sorter: {
                compare: (a, b) => a.date.localeCompare(b.date),
                multiple: 2,
            },
        },
        {
            title: t('duration_col'),
            dataIndex: 'duration',
            editable: false,
            ...getColumnSearchProps('duration'),
            sorter: {
                compare: (a, b) => a.duration.localeCompare(b.duration),
                multiple: 2,
            },
        },
        {
            title: t('users_col'),
            dataIndex: 'users',
            editable: false,
            render: (users) => {
                return (
                    <Space size="small">
                        <UserOutlined />
                        <span>{users}</span>
                    </Space>
                );
            },
            sorter: {
                compare: (a, b) => a.users - b.users,
                multiple: 1,
            },
        },
        {
            title: t('state_col'),
            dataIndex: 'state',
            editable: false,
            render: (text, record) => {
                const stateText = record.state;
                let stateIcon;
                let stateColor;
                switch (stateText) {
                    case 'publishing':
                    case 'published':
                        stateColor = 'success';
                        stateIcon = <CheckCircleOutlined />;
                        break;

                    case 'processing':
                    case 'processed':
                        stateColor = 'blue';
                        stateIcon = <SyncOutlined spin={'processing' && true} />;
                        break;

                    case 'unpublishing':
                    case 'unpublished':
                        stateColor = 'warning';
                        stateIcon = <MinusCircleOutlined />;
                        break;

                    case 'deleting':
                    case 'deleted':
                        stateColor = 'error';
                        stateIcon = <DeleteOutlined />;
                        break;

                    default:
                        stateColor = 'default';
                        stateIcon = <InfoCircleOutlined />;
                }
                return (
                    <Tag icon={stateIcon} color={stateColor}>
                        {t(stateText)}
                    </Tag>
                );
            },
            filters: recordingStates.map((item) => ({
                text: t(item),
                value: item,
            })),
            onFilter: (value, record) => record.state === value,
            sorter: {
                compare: (a, b) => a.state.localeCompare(b.state),
                multiple: 2,
            },
        },
        {
            title: t('formats_col'),
            dataIndex: 'formats',
            editable: false,
            render: (text, record) => {
                return getFormatIcons(record.formats);
            },
        },
        {
            title: t('actions_col'),
            dataIndex: 'actions',
            editable: false,
            render: (text, record) => {
                const clickCancel = (record) => {
                    CompareRecords(record, editForm.getFieldsValue(true)) ? cancelEdit() : setCancelVisibility(true);
                };

                return isEditing(record) ? (
                    <Space size="middle">
                        <Popconfirm
                            title={t('cancel_edit')}
                            placement="leftTop"
                            visible={cancelVisibility}
                            onVisibleChange={() => clickCancel(record)}
                            onConfirm={cancelEdit}
                            onCancel={() => setCancelVisibility(false)}
                        >
                            <Button size="middle" className="cell-input-cancel">
                                <Trans i18nKey="cancel" />
                            </Button>
                        </Popconfirm>
                        <Button
                            size="middle"
                            type="primary"
                            className="cell-input-save"
                            onClick={() => saveEdit(record)}
                        >
                            <Trans i18nKey="save" />
                        </Button>
                    </Space>
                ) : (
                    <Space size="middle" className="table-actions">
                        {AuthService.isAllowedAction(actions, 'edit') && (
                            <Link disabled={editingKey !== null} onClick={() => toggleEdit(record)}>
                                <EditOutlined /> <Trans i18nKey="edit" />
                            </Link>
                        )}
                        {AuthService.isAllowedAction(actions, 'delete') && (
                            <Popconfirm
                                title={t('delete_recording_confirm')}
                                icon={<QuestionCircleOutlined className="red-icon" />}
                                onConfirm={() => handleDelete(record.key)}
                            >
                                <Link>
                                    <DeleteOutlined /> <Trans i18nKey="delete" />
                                </Link>
                            </Popconfirm>
                        )}
                        {AuthService.isAllowedAction(actions, 'share') && (
                            <Tooltip
                                placement={LocaleService.direction == 'rtl' ? 'right' : 'left'}
                                title={getFormatIcons(record.formats, true)}
                            >
                                <Link onClick={() => showModal(record.formats, record.url)}>
                                    <ShareAltOutlined />
                                </Link>
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        },
    ];
    const mergedColumns = columns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record: RecordingType) => ({
                record,
                editing: isEditing(record),
                dataIndex: col.dataIndex,
                title: col.title,
            }),
        };
    });

    return (
        <>
            <PageHeader className="site-page-header" title={<Trans i18nKey="recordings" />} />

            {isModalVisible && (
                <Modal
                    className="share-modal"
                    centered
                    visible={isModalVisible}
                    onOk={handleShare}
                    onCancel={cancelShare}
                    footer={null}
                >
                    <Form layout="vertical" hideRequiredMark onFinish={handleShare} validateTrigger="onSubmit">
                        <Space size={38} direction="vertical">
                            <div className="mt-24">{getFormatIcons(modalFormats, true)}</div>
                            <Space size="middle" className="social-medias">
                                <Avatar size={75} className="hivelvet-btn">
                                    <div className="hivelvet-white-btn">
                                        <FacebookOutlined />
                                    </div>
                                </Avatar>
                                <Avatar size={75} className="hivelvet-btn">
                                    <div className="hivelvet-white-btn">
                                        <TwitterOutlined />
                                    </div>
                                </Avatar>
                                <Avatar size={75} className="hivelvet-btn">
                                    <div className="hivelvet-white-btn">
                                        <LinkedinOutlined />
                                    </div>
                                </Avatar>
                            </Space>
                            <Input
                                readOnly
                                defaultValue={modalUrl}
                                suffix={
                                    copied ? (
                                        <CheckOutlined className="text-success" />
                                    ) : (
                                        <CopyToClipboard text={modalUrl} onCopy={copyClipboard}>
                                            <CopyOutlined />
                                        </CopyToClipboard>
                                    )
                                }
                            />
                            <Form.Item className="modal-submit-btn">
                                <Button type="primary" id="submit-btn" htmlType="submit" block>
                                    <Trans i18nKey="share" />
                                </Button>
                            </Form.Item>
                        </Space>
                    </Form>
                </Modal>
            )}

            <Table
                className="hivelvet-table"
                components={{
                    body: {
                        cell: EditableCell,
                        row: EditableRow,
                    },
                }}
                columns={mergedColumns}
                dataSource={data}
                pagination={pagination}
                loading={loading}
                onChange={(newPagination: PaginationType) => setPagination(newPagination)}
            />
        </>
    );
};

export default withTranslation()(Recordings);
