/**
 * Decap CMS 自定义标签：网格展示（默认每行 10 个）、回车添加、× 删除。
 * 依赖 decap-cms.js 提供的全局 CMS、createClass、h（见官方文档 Creating Custom Widgets）。
 */
(function () {
  var CMS = window.CMS;
  var createClass = window.createClass;
  var h = window.h;
  if (!CMS || typeof CMS.registerWidget !== 'function' || !createClass || !h) {
    console.error('[tags-widget] 需要先于本脚本加载 decap-cms.js（含 CMS / createClass / h）');
    return;
  }

  function fieldGet(field, key, def) {
    if (field == null) return def;
    if (typeof field.get === 'function') return field.get(key, def);
    var o = field;
    return o[key] !== undefined && o[key] !== null ? o[key] : def;
  }

  function normTags(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map(function (x) { return String(x); });
    if (typeof v.toArray === 'function') return v.toArray().map(function (x) { return String(x); });
    return [String(v)];
  }

  var TagsControl = createClass({
    getInitialState: function () {
      return { draft: '' };
    },

    setDraft: function (s) {
      this.setState({ draft: s });
    },

    addTag: function (raw) {
      var t = String(raw || '').trim();
      if (!t) return;
      var tags = normTags(this.props.value);
      if (tags.indexOf(t) !== -1) return;
      this.props.onChange(tags.concat([t]));
      this.setState({ draft: '' });
    },

    removeAt: function (i) {
      var tags = normTags(this.props.value).slice();
      tags.splice(i, 1);
      this.props.onChange(tags.length ? tags : []);
    },

    onKeyDown: function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTag(this.state.draft);
      }
    },

    render: function () {
      var props = this.props;
      var tags = normTags(props.value);
      var cols = fieldGet(props.field, 'columns', 10);
      var gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))',
        gap: '0.45rem',
        marginBottom: '0.65rem',
        alignItems: 'start',
      };
      var self = this;
      return h(
        'div',
        { className: 'nc-tag-chips ' + (props.classNameWrapper || '') },
        h(
          'div',
          { className: 'nc-tag-chips__grid', style: gridStyle },
          tags.map(function (tag, i) {
            return h(
              'span',
              {
                key: i + ':' + tag,
                className: 'nc-tag-chips__chip',
                title: tag,
              },
              h('span', { className: 'nc-tag-chips__text' }, tag),
              h(
                'button',
                {
                  type: 'button',
                  className: 'nc-tag-chips__remove',
                  'aria-label': '删除标签',
                  onClick: function () {
                    self.removeAt(i);
                  },
                },
                '×'
              )
            );
          })
        ),
        h('input', {
          id: props.forID,
          className: 'nc-tag-chips__input',
          type: 'text',
          value: this.state.draft,
          placeholder: '输入标签，回车添加',
          autoComplete: 'off',
          onChange: function (e) {
            self.setDraft(e.target.value);
          },
          onKeyDown: this.onKeyDown,
        })
      );
    },
  });

  var TagsPreview = createClass({
    render: function () {
      var tags = normTags(this.props.value);
      if (!tags.length) {
        return h('span', { className: 'nc-tag-chips-preview nc-tag-chips-preview--empty' }, '—');
      }
      return h('span', { className: 'nc-tag-chips-preview' }, tags.join(' · '));
    },
  });

  var schema = {
    properties: {
      columns: { type: 'integer' },
    },
  };

  CMS.registerWidget('tag_chips', TagsControl, TagsPreview, schema);
})();
