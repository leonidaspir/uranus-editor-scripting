export default class Styles {
  static getOverrides() {
    return `
        .uranus-toolbar.active{
            color: #b1b8ba;
            background-color: #20292b;
            box-shadow: 0 0 8px rgba(0,0,0,0.5);
        }
        .uranus-list{
            box-shadow: none !important;
            width: 140px !important;
        }
        .uranus-list-item{
            cursor: default;
        }
        .uranus-checkbox{
            float: right;
            margin-top: 9px;
            line-height: 33px !important;
        }
        `;
  }
}
