import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

const { TextArea } = Input;

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form] = Form.useForm();

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await api.get('/teams');
      setTeams(response.data);
    } catch (error) {
      message.error('获取团队列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.filter(u => u.role === 'manager' || u.role === 'admin'));
    } catch (error) {
      message.error('获取用户列表失败');
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const handleAdd = () => {
    setEditingTeam(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingTeam(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/teams/${id}`);
      message.success('删除成功');
      fetchTeams();
    } catch (error) {
      message.error(error.response?.data?.msg || '删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingTeam) {
        await api.put(`/teams/${editingTeam.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/teams', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchTeams();
    } catch (error) {
      message.error(error.response?.data?.msg || '操作失败');
    }
  };

  const columns = [
    {
      title: '团队名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '负责人',
      dataIndex: 'manager_name',
      key: 'manager_name',
      render: (text) => text || '-',
    },
    {
      title: '成员数',
      dataIndex: 'member_count',
      key: 'member_count',
      render: (count) => count || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => text ? new Date(text).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个团队吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h3 className="page-title">团队管理</h3>
      <div className="action-bar">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建团队
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={teams}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingTeam ? '编辑团队' : '新建团队'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="团队名称"
            rules={[{ required: true, message: '请输入团队名称' }]}
          >
            <Input placeholder="请输入团队名称" />
          </Form.Item>
          <Form.Item name="description" label="团队描述">
            <TextArea rows={3} placeholder="请输入团队描述" />
          </Form.Item>
          <Form.Item name="manager_id" label="负责人">
            <Select placeholder="请选择负责人" allowClear>
              {users.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Teams;
